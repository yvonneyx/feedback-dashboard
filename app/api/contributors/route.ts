import { Octokit } from '@octokit/rest';
import { NextResponse } from 'next/server';

// 直接设置API超时常量
const API_TIMEOUT = 120000; // 默认120秒

// 配置GitHub API客户端，增加重试和超时配置
const octokit = new Octokit({
  auth: process.env.PERSONAL_GITHUB_TOKEN,
  request: {
    timeout: API_TIMEOUT,
  },
});

// 设置 API 路由配置
export const config = {
  runtime: 'nodejs',
  maxDuration: 300, // 设置最大执行时间为300秒(5分钟)
};

// 定义贡献者角色
type ContributorRole =
  | 'OWNER'
  | 'MEMBER'
  | 'COLLABORATOR'
  | 'CONTRIBUTOR'
  | 'FIRST_TIME_CONTRIBUTOR'
  | 'FIRST_TIMER'
  | 'NONE';

// 贡献者信息接口
interface Contributor {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  contributions: number;
  role: ContributorRole;
  repos: string[]; // 参与的仓库列表
  is_maintainer: boolean;
  pull_requests: number; // 提交的PR数量
}

export async function POST(request: Request) {
  try {
    const { startDate, endDate, repos } = await request.json();

    if (!repos || !Array.isArray(repos) || repos.length === 0) {
      return NextResponse.json({ error: '仓库参数是必须的' }, { status: 400 });
    }

    // 获取所有仓库的贡献者
    const allContributors = await fetchAllContributors(repos, startDate, endDate);

    // 返回汇总后的贡献者数据
    return NextResponse.json(allContributors);
  } catch (error) {
    console.error('获取GitHub贡献者失败:', error);
    return NextResponse.json({ error: '获取GitHub数据时出错' }, { status: 500 });
  }
}

// 获取多个仓库的所有贡献者
async function fetchAllContributors(repos: string[], startDate: string, endDate: string) {
  const contributorsMap = new Map<string, Contributor>();
  // PR计数映射表，用于统计每个用户提交的PR数量
  const prCountMap = new Map<string, number>();

  // 获取维护者列表（仓库协作者）
  const maintainersMap = new Map<string, Set<string>>();
  for (const repo of repos) {
    const [owner, repoName] = repo.split('/');
    const maintainers = await fetchRepoMaintainers(owner, repoName);
    maintainersMap.set(repo, new Set(maintainers));
  }

  // 获取指定时间段内的提交数据
  for (const repo of repos) {
    const [owner, repoName] = repo.split('/');

    // 获取仓库提交记录
    const commits = await fetchCommits(owner, repoName, startDate, endDate);

    // 提取贡献者信息
    for (const commit of commits) {
      if (!commit.author || !commit.author.login) continue;

      const login = commit.author.login;
      const isMaintainer = maintainersMap.get(repo)?.has(login) || false;

      // 更新或创建贡献者记录
      if (contributorsMap.has(login)) {
        const contributor = contributorsMap.get(login)!;
        contributor.contributions += 1;

        // 添加新的仓库（如果尚未存在）
        if (!contributor.repos.includes(repo)) {
          contributor.repos.push(repo);
        }

        // 更新维护者状态
        if (isMaintainer && !contributor.is_maintainer) {
          contributor.is_maintainer = true;
        }
      } else {
        contributorsMap.set(login, {
          login: login,
          id: commit.author.id,
          avatar_url: commit.author.avatar_url,
          html_url: commit.author.html_url,
          contributions: 1,
          role: 'CONTRIBUTOR', // 默认角色
          repos: [repo],
          is_maintainer: isMaintainer,
          pull_requests: 0, // 初始化PR数量为0
        });
      }
    }

    // 通过PR获取更详细的贡献者信息
    const pullRequests = await fetchPullRequests(owner, repoName, startDate, endDate);
    for (const pr of pullRequests) {
      if (!pr.user || !pr.user.login) continue;

      const login = pr.user.login;
      const isMaintainer = maintainersMap.get(repo)?.has(login) || false;

      // 更新PR计数
      prCountMap.set(login, (prCountMap.get(login) || 0) + 1);

      // 更新或创建贡献者记录
      if (contributorsMap.has(login)) {
        const contributor = contributorsMap.get(login)!;
        contributor.contributions += 1;

        // 添加新的仓库（如果尚未存在）
        if (!contributor.repos.includes(repo)) {
          contributor.repos.push(repo);
        }

        // 更新维护者状态
        if (isMaintainer && !contributor.is_maintainer) {
          contributor.is_maintainer = true;
        }
      } else {
        contributorsMap.set(login, {
          login: login,
          id: pr.user.id,
          avatar_url: pr.user.avatar_url,
          html_url: pr.user.html_url,
          contributions: 1,
          role: 'CONTRIBUTOR', // 默认角色
          repos: [repo],
          is_maintainer: isMaintainer,
          pull_requests: 0, // 初始化PR数量为0
        });
      }
    }
  }

  // 更新所有贡献者的PR数量
  for (const [login, prCount] of Array.from(prCountMap.entries())) {
    if (contributorsMap.has(login)) {
      contributorsMap.get(login)!.pull_requests = prCount;
    }
  }

  // 获取贡献者角色信息
  for (const entry of Array.from(contributorsMap.entries())) {
    const [login, contributor] = entry;
    for (const repo of contributor.repos) {
      const [owner, repoName] = repo.split('/');
      try {
        const { data: permissionData } = await fetchWithRetry(() =>
          octokit.repos.getCollaboratorPermissionLevel({
            owner,
            repo: repoName,
            username: login,
          })
        );

        if (permissionData.permission === 'admin') {
          contributor.role = 'OWNER';
          contributor.is_maintainer = true;
          break;
        } else if (
          permissionData.permission === 'write' ||
          permissionData.permission === 'maintain'
        ) {
          contributor.role = 'MEMBER';
          contributor.is_maintainer = true;
          break;
        } else if (permissionData.permission === 'read' || permissionData.permission === 'triage') {
          contributor.role = 'COLLABORATOR';
          break;
        }
      } catch (error) {
        // 无法获取权限信息，保持默认角色
        console.log(`无法获取用户 ${login} 在仓库 ${repo} 的权限信息`);
      }
    }
  }

  return Array.from(contributorsMap.values());
}

// 获取仓库维护者列表
async function fetchRepoMaintainers(owner: string, repo: string): Promise<string[]> {
  try {
    const { data: collaborators } = await fetchWithRetry(() =>
      octokit.repos.listCollaborators({
        owner,
        repo,
        affiliation: 'direct',
      })
    );

    return collaborators
      .filter(
        (user: any) => user.permissions?.pull && (user.permissions?.push || user.permissions?.admin)
      )
      .map((user: any) => user.login);
  } catch (error) {
    console.error(`获取仓库 ${owner}/${repo} 的维护者列表失败:`, error);
    return [];
  }
}

// 获取仓库在指定时间段内的提交
async function fetchCommits(owner: string, repo: string, startDate: string, endDate: string) {
  const commits = [];
  let page = 1;
  let hasMorePages = true;

  try {
    while (hasMorePages) {
      const { data } = await fetchWithRetry(() =>
        octokit.repos.listCommits({
          owner,
          repo,
          since: startDate,
          until: endDate,
          per_page: 100,
          page,
        })
      );

      if (data.length > 0) {
        commits.push(...data);
      }

      hasMorePages = data.length === 100;
      page++;
    }

    return commits;
  } catch (error) {
    console.error(`获取仓库 ${owner}/${repo} 的提交失败:`, error);
    return [];
  }
}

// 获取仓库在指定时间段内的PR
async function fetchPullRequests(owner: string, repo: string, startDate: string, endDate: string) {
  const pullRequests = [];
  let page = 1;
  let hasMorePages = true;

  try {
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);

    while (hasMorePages) {
      const { data } = await fetchWithRetry(() =>
        octokit.pulls.list({
          owner,
          repo,
          state: 'all', // 包括所有状态的PR
          sort: 'created',
          direction: 'desc',
          per_page: 100,
          page,
        })
      );

      if (data.length > 0) {
        // 筛选时间范围内的PR
        const filteredPRs = data.filter((pr: any) => {
          const createdAt = new Date(pr.created_at);
          return createdAt >= startDateTime && createdAt <= endDateTime;
        });

        pullRequests.push(...filteredPRs);
      }

      // 如果返回的数据少于100或者最早的PR创建时间早于开始日期，就不再继续查询
      const oldestPRDate =
        data.length > 0 ? new Date(data[data.length - 1].created_at) : new Date();
      hasMorePages = data.length === 100 && oldestPRDate >= startDateTime;
      page++;
    }

    return pullRequests;
  } catch (error) {
    console.error(`获取仓库 ${owner}/${repo} 的PR失败:`, error);
    return [];
  }
}

// 重试函数，当请求失败时重试
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries = 3,
  delay = 2000
): Promise<T> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await fetchFn();
    } catch (error: any) {
      retries++;

      // 如果是最后一次尝试失败，直接抛出错误
      if (retries === maxRetries) {
        throw error;
      }

      // 如果是速率限制错误，延迟更长时间
      if (error?.status === 403 && error?.headers?.['x-ratelimit-remaining'] === '0') {
        const resetTime = error?.headers?.['x-ratelimit-reset']
          ? parseInt(error.headers['x-ratelimit-reset']) * 1000
          : Date.now() + 60000;

        const waitTime = Math.max(resetTime - Date.now(), 10000);
        console.log(`GitHub API 速率限制，等待 ${waitTime / 1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // 常规错误，使用指数退避策略
        const waitTime = delay * Math.pow(2, retries - 1);
        console.log(`请求失败，${waitTime / 1000} 秒后重试(${retries}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // 这一行代码实际上不会被执行到，因为要么成功返回，要么抛出异常
  // 但需要添加以满足TypeScript类型检查
  throw new Error('所有重试失败');
}
