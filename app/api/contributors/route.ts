import { Octokit } from '@octokit/rest';
import { NextResponse } from 'next/server';

// 直接设置API超时常量
const API_TIMEOUT = 180000; // 增加到180秒

// 配置GitHub API客户端，增加重试和超时配置
const octokit = new Octokit({
  auth: process.env.PERSONAL_GITHUB_TOKEN,
  request: {
    timeout: API_TIMEOUT,
  },
});

// App Router 路由配置
// Vercel 计划限制：Hobby=10s, Pro=60s, Enterprise=900s
export const maxDuration = 10; // 限制为 10 秒，确保 Hobby 计划可用
export const dynamic = 'force-dynamic'; // 禁用缓存，确保每次都是动态请求

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
    const { startDate, endDate, repo } = await request.json();

    // 单个仓库请求
    if (!repo || typeof repo !== 'string') {
      return NextResponse.json({ error: '仓库参数是必须的' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');
    if (!owner || !repoName) {
      return NextResponse.json({ error: '仓库格式错误，应为 owner/repo' }, { status: 400 });
    }

    // 获取单个仓库的贡献者
    const contributors = await fetchRepoContributors(owner, repoName, startDate, endDate);

    // 返回该仓库的贡献者数据
    return NextResponse.json(contributors);
  } catch (error) {
    console.error('获取GitHub贡献者失败:', error);
    return NextResponse.json({ error: '获取GitHub数据时出错' }, { status: 500 });
  }
}

// 获取单个仓库的贡献者
async function fetchRepoContributors(
  owner: string,
  repoName: string,
  startDate: string,
  endDate: string
) {
  console.log(
    `开始获取仓库 ${owner}/${repoName} 的贡献者数据，时间范围: ${startDate} - ${endDate}`
  );
  const contributorsMap = new Map<string, Contributor>();
  const prCountMap = new Map<string, number>();
  const repo = `${owner}/${repoName}`;

  // 获取维护者列表（仓库协作者）
  console.log(`获取 ${repo} 的维护者列表...`);
  const maintainers = await fetchRepoMaintainers(owner, repoName);
  const maintainersSet = new Set(maintainers);
  console.log(`获取到 ${repo} 的维护者: ${maintainers.length}人`);

  // // 获取仓库提交记录
  // console.log(`获取 ${repo} 的提交记录...`);
  // const commits = await fetchCommits(owner, repoName, startDate, endDate);
  // console.log(`获取到 ${repo} 的提交: ${commits.length}条`);

  // // 提取贡献者信息
  // for (const commit of commits) {
  //   if (!commit.author || !commit.author.login) continue;

  //   const login = commit.author.login;

  //   // 过滤掉 GitHub Apps (html_url 包含 /apps/)
  //   if (commit.author.html_url?.includes('/apps/')) {
  //     continue;
  //   }

  //   const isMaintainer = maintainersSet.has(login);

  //   // 更新或创建贡献者记录
  //   if (contributorsMap.has(login)) {
  //     const contributor = contributorsMap.get(login)!;
  //     contributor.contributions += 1;
  //   } else {
  //     contributorsMap.set(login, {
  //       login: login,
  //       id: commit.author.id,
  //       avatar_url: commit.author.avatar_url,
  //       html_url: commit.author.html_url,
  //       contributions: 1,
  //       role: 'CONTRIBUTOR', // 默认角色
  //       repos: [repo],
  //       is_maintainer: isMaintainer,
  //       pull_requests: 0, // 初始化PR数量为0
  //     });
  //   }
  // }

  // 通过PR获取更详细的贡献者信息
  console.log(`获取 ${repo} 的PR记录...`);
  const pullRequests = await fetchPullRequests(owner, repoName, startDate, endDate);
  console.log(`获取到 ${repo} 的PR: ${pullRequests.length}条`);

  for (const pr of pullRequests) {
    if (!pr.user || !pr.user.login) continue;

    const login = pr.user.login;

    // 过滤掉 GitHub Apps (html_url 包含 /apps/)
    if (pr.user.html_url?.includes('/apps/')) {
      continue;
    }

    const isMaintainer = maintainersSet.has(login);

    // 更新PR计数
    prCountMap.set(login, (prCountMap.get(login) || 0) + 1);

    // 更新或创建贡献者记录
    if (contributorsMap.has(login)) {
      const contributor = contributorsMap.get(login)!;
      contributor.contributions += 1;
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

  // 更新所有贡献者的PR数量
  for (const [login, prCount] of Array.from(prCountMap.entries())) {
    if (contributorsMap.has(login)) {
      contributorsMap.get(login)!.pull_requests = prCount;
    }
  }

  console.log('开始获取贡献者角色信息...');
  // 获取贡献者角色信息
  const contributors = Array.from(contributorsMap.entries());

  for (const [login, contributor] of contributors) {
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
      } else if (
        permissionData.permission === 'write' ||
        permissionData.permission === 'maintain'
      ) {
        contributor.role = 'MEMBER';
        contributor.is_maintainer = true;
      } else if (permissionData.permission === 'read' || permissionData.permission === 'triage') {
        contributor.role = 'COLLABORATOR';
      }
    } catch (error) {
      // 无法获取权限信息，保持默认角色
      console.log(`无法获取用户 ${login} 在仓库 ${repo} 的权限信息`);
    }
  }

  console.log(`仓库 ${repo} 贡献者数据获取完成，共 ${contributorsMap.size} 人`);
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
// async function fetchCommits(owner: string, repo: string, startDate: string, endDate: string) {
//   const commits = [];
//   let page = 1;
//   let hasMorePages = true;

//   try {
//     while (hasMorePages) {
//       const { data } = await fetchWithRetry(() =>
//         octokit.repos.listCommits({
//           owner,
//           repo,
//           since: startDate,
//           until: endDate,
//           per_page: 100,
//           page,
//         })
//       );

//       if (data.length > 0) {
//         commits.push(...data);
//       }

//       hasMorePages = data.length === 100;
//       page++;
//     }

//     return commits;
//   } catch (error) {
//     console.error(`获取仓库 ${owner}/${repo} 的提交失败:`, error);
//     return [];
//   }
// }

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
  maxRetries = 5, // 增加到5次重试
  delay = 3000 // 增加基础延迟到3秒
): Promise<T> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await fetchFn();
    } catch (error: any) {
      retries++;

      // 如果是最后一次尝试失败，直接抛出错误
      if (retries === maxRetries) {
        console.error(`所有重试失败，最终错误:`, error);
        throw error;
      }

      // 如果是速率限制错误，延迟更长时间
      if (error?.status === 403 && error?.headers?.['x-ratelimit-remaining'] === '0') {
        const resetTime = error?.headers?.['x-ratelimit-reset']
          ? parseInt(error.headers['x-ratelimit-reset']) * 1000
          : Date.now() + 60000;

        const waitTime = Math.max(resetTime - Date.now(), 15000); // 至少等待15秒
        console.log(`GitHub API 速率限制，等待 ${waitTime / 1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // 常规错误，使用指数退避策略
        const waitTime = delay * Math.pow(2, retries - 1);
        console.log(
          `请求失败(${error?.status || '未知错误'})，${waitTime / 1000} 秒后重试(${retries}/${maxRetries})...`
        );
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // 这一行代码实际上不会被执行到，因为要么成功返回，要么抛出异常
  // 但需要添加以满足TypeScript类型检查
  throw new Error('所有重试失败');
}
