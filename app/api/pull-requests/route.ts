import { Octokit } from '@octokit/rest';
import { NextResponse } from 'next/server';

// 设置API超时常量
const API_TIMEOUT = 180000; // 3分钟超时

// 配置GitHub API客户端
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

// PR类型分类
const PR_TYPES = {
  feat: 'feat',
  fix: 'fix',
  docs: 'docs',
  style: 'style',
  refactor: 'refactor',
  test: 'test',
  chore: 'chore',
  other: 'other',
};

// PR信息接口
interface PullRequestInfo {
  number: number;
  title: string;
  state: string;
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  type: string;
  repo: string;
  additions: number;
  deletions: number;
  changed_files: number;
}

export async function POST(request: Request) {
  try {
    // 添加请求体大小验证
    const body = await request.json();
    const { repos, startDate, endDate } = body;

    // 参数验证
    if (!repos || !Array.isArray(repos) || repos.length === 0) {
      return NextResponse.json({ error: '仓库参数是必须的' }, { status: 400 });
    }

    if (repos.length > 10) {
      return NextResponse.json({ error: '一次最多只能查询10个仓库' }, { status: 400 });
    }

    // 验证仓库名格式
    const invalidRepos = repos.filter(repo => !repo.includes('/') || repo.split('/').length !== 2);
    if (invalidRepos.length > 0) {
      return NextResponse.json(
        {
          error: `仓库名格式不正确: ${invalidRepos.join(', ')}`,
        },
        { status: 400 }
      );
    }

    console.log(`🚀 API开始获取 ${repos.length} 个仓库的PR数据`);
    console.log(`📅 时间范围: ${startDate} - ${endDate}`);

    // 计算时间范围
    const now = new Date();
    const filterStartDate = startDate
      ? new Date(startDate)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const filterEndDate = endDate ? new Date(endDate) : now;

    // 验证日期范围
    if (filterStartDate > filterEndDate) {
      return NextResponse.json({ error: '开始日期不能晚于结束日期' }, { status: 400 });
    }

    const daysDiff = Math.ceil(
      (filterEndDate.getTime() - filterStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > 365) {
      return NextResponse.json({ error: '查询时间范围不能超过365天' }, { status: 400 });
    }

    // 为了获取足够的数据，我们从更早的时间开始获取（最多2个月）
    const fetchStartDate = new Date(
      Math.min(
        filterStartDate.getTime(),
        now.getTime() - 60 * 24 * 60 * 60 * 1000 // 2个月前，减少查询范围
      )
    );

    console.log(`📊 实际查询时间范围: ${fetchStartDate.toISOString()} - ${now.toISOString()}`);

    // 获取所有仓库的PR数据
    const allPRs = await fetchAllPullRequests(repos, fetchStartDate, now);

    // 验证获取到的数据
    if (!Array.isArray(allPRs)) {
      throw new Error('获取到的PR数据格式不正确');
    }

    console.log(`✅ 成功获取 ${allPRs.length} 条PR数据`);

    // 分析PR数据
    const analysis = analyzePRData(allPRs, filterStartDate, filterEndDate, fetchStartDate, now);

    // 验证分析结果
    if (!analysis || !analysis.summary || !analysis.details) {
      throw new Error('PR数据分析失败');
    }

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const errorObj = error as Error;
    console.error('❌ 获取GitHub PR数据失败:', {
      错误类型: errorObj.name,
      错误信息: errorObj.message,
      堆栈: errorObj.stack,
    });

    // 根据错误类型返回不同的状态码
    let status = 500;
    let message = '获取GitHub数据时出错';

    if (errorObj.message.includes('rate limit')) {
      status = 429;
      message = 'GitHub API请求过于频繁，请稍后再试';
    } else if (errorObj.message.includes('timeout')) {
      status = 504;
      message = '请求超时，请稍后重试';
    } else if (errorObj.message.includes('network') || errorObj.message.includes('fetch')) {
      status = 503;
      message = '网络连接失败，请稍后重试';
    } else if (errorObj.message.includes('验证') || errorObj.message.includes('格式')) {
      status = 400;
      message = errorObj.message;
    }

    return NextResponse.json(
      {
        error: message,
        details: process.env.NODE_ENV === 'development' ? errorObj.message : undefined,
      },
      { status }
    );
  }
}

// 获取多个仓库的所有PR数据
async function fetchAllPullRequests(repos: string[], startDate: Date, endDate: Date) {
  const allPRs: PullRequestInfo[] = [];

  // 分批处理仓库，每批5个仓库（提高并发效率）
  const batchSize = 5;
  for (let i = 0; i < repos.length; i += batchSize) {
    const batchRepos = repos.slice(i, i + batchSize);
    console.log(`处理第${i / batchSize + 1}批仓库: ${batchRepos.join(', ')}`);

    // 并发获取每个仓库的PR数据
    const batchPromises = batchRepos.map(async repo => {
      const [owner, repoName] = repo.split('/');
      console.log(`开始获取仓库 ${repo} 的PR数据`);

      try {
        const prs = await fetchPullRequests(owner, repoName, startDate, endDate);
        console.log(`获取到 ${repo} 的PR: ${prs.length}条`);
        return prs.map(pr => ({ ...pr, repo }));
      } catch (error) {
        console.error(`获取仓库 ${repo} 的PR失败:`, error);
        return [];
      }
    });

    // 等待当前批次的所有仓库处理完成
    const batchResults = await Promise.all(batchPromises);
    allPRs.push(...batchResults.flat());

    console.log(`第${i / batchSize + 1}批仓库处理完成`);
  }

  console.log(`总共获取了${allPRs.length}个PR`);
  return allPRs;
}

// 获取单个仓库的PR数据
async function fetchPullRequests(owner: string, repo: string, startDate: Date, endDate: Date) {
  const pullRequests: PullRequestInfo[] = [];
  let page = 1;
  let hasMorePages = true;

  try {
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
          return createdAt >= startDate && createdAt <= endDate;
        });

        // 获取每个PR的详细信息（包括文件变更信息）
        for (const pr of filteredPRs) {
          try {
            pullRequests.push({
              number: pr.number,
              title: pr.title,
              state: pr.state,
              created_at: pr.created_at,
              merged_at: pr.merged_at,
              closed_at: pr.closed_at,
              html_url: pr.html_url,
              user: {
                login: pr.user?.login || 'unknown',
                avatar_url: pr.user?.avatar_url || '',
              },
              type: classifyPRType(pr.title),
              repo: `${owner}/${repo}`,
              additions: 0, // 不再获取详细的代码变更信息以提高性能
              deletions: 0,
              changed_files: 0,
            });
          } catch (error) {
            console.error(`处理PR #${pr.number}失败:`, error);
          }
        }
      }

      // 检查是否还有更多页面
      const oldestPRDate =
        data.length > 0 ? new Date(data[data.length - 1].created_at) : new Date();
      hasMorePages = data.length === 100 && oldestPRDate >= startDate;
      page++;
    }

    return pullRequests;
  } catch (error) {
    console.error(`获取仓库 ${owner}/${repo} 的PR失败:`, error);
    return [];
  }
}

// 分类PR类型
function classifyPRType(title: string): string {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('feat') || lowerTitle.includes('feature')) {
    return PR_TYPES.feat;
  } else if (lowerTitle.includes('fix') || lowerTitle.includes('bug')) {
    return PR_TYPES.fix;
  } else if (lowerTitle.includes('docs') || lowerTitle.includes('doc')) {
    return PR_TYPES.docs;
  } else if (lowerTitle.includes('style') || lowerTitle.includes('format')) {
    return PR_TYPES.style;
  } else if (lowerTitle.includes('refactor') || lowerTitle.includes('refact')) {
    return PR_TYPES.refactor;
  } else if (lowerTitle.includes('test')) {
    return PR_TYPES.test;
  } else if (
    lowerTitle.includes('chore') ||
    lowerTitle.includes('build') ||
    lowerTitle.includes('ci')
  ) {
    return PR_TYPES.chore;
  }

  return PR_TYPES.other;
}

// 分析PR数据
function analyzePRData(
  allPRs: PullRequestInfo[],
  filterStartDate: Date,
  filterEndDate: Date,
  fetchStartDate: Date,
  fetchEndDate: Date
) {
  // 按时间范围分类
  const filteredPRs = allPRs.filter(pr => {
    const createdAt = new Date(pr.created_at);
    return createdAt >= filterStartDate && createdAt <= filterEndDate;
  });

  // 统计函数
  const getStats = (prs: PullRequestInfo[]) => {
    const total = prs.length;
    const merged = prs.filter(pr => pr.state === 'closed' && pr.merged_at).length;
    const open = prs.filter(pr => pr.state === 'open').length;
    const closed = prs.filter(pr => pr.state === 'closed' && !pr.merged_at).length;

    // 按类型分布
    const typeDistribution = Object.keys(PR_TYPES).reduce(
      (acc, type) => {
        acc[type] = prs.filter(pr => pr.type === type).length;
        return acc;
      },
      {} as Record<string, number>
    );

    // 按仓库分布
    const repoDistribution = prs.reduce(
      (acc, pr) => {
        const repoName = pr.repo.split('/').pop() || pr.repo;
        acc[repoName] = (acc[repoName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // 代码变更统计
    const codeStats = prs.reduce(
      (acc, pr) => {
        acc.totalAdditions += pr.additions;
        acc.totalDeletions += pr.deletions;
        acc.totalChangedFiles += pr.changed_files;
        return acc;
      },
      { totalAdditions: 0, totalDeletions: 0, totalChangedFiles: 0 }
    );

    return {
      total,
      merged,
      open,
      closed,
      mergeRate: total > 0 ? Math.round((merged / total) * 100) : 0,
      typeDistribution,
      repoDistribution,
      codeStats,
    };
  };

  // 获取详细PR列表（按类型分组）
  const getPRDetails = (prs: PullRequestInfo[]) => {
    return Object.keys(PR_TYPES).reduce(
      (acc, type) => {
        acc[type] = prs
          .filter(pr => pr.type === type)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return acc;
      },
      {} as Record<string, PullRequestInfo[]>
    );
  };

  return {
    summary: {
      total: getStats(allPRs),
      filtered: getStats(filteredPRs),
    },
    details: {
      total: getPRDetails(allPRs),
      filtered: getPRDetails(filteredPRs),
    },
    rawData: allPRs,
    timeRange: {
      startDate: filterStartDate.toISOString(),
      endDate: filterEndDate.toISOString(),
      fetchStartDate: fetchStartDate.toISOString(),
      fetchEndDate: fetchEndDate.toISOString(),
    },
  };
}

// 重试函数
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries = 5,
  delay = 3000
): Promise<T> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await fetchFn();
    } catch (error: any) {
      retries++;

      if (retries === maxRetries) {
        console.error(`所有重试失败，最终错误:`, error);
        throw error;
      }

      // 如果是速率限制错误，延迟更长时间
      if (error?.status === 403 && error?.headers?.['x-ratelimit-remaining'] === '0') {
        const resetTime = error?.headers?.['x-ratelimit-reset']
          ? parseInt(error.headers['x-ratelimit-reset']) * 1000
          : Date.now() + 60000;

        const waitTime = Math.max(resetTime - Date.now(), 15000);
        console.log(`GitHub API 速率限制，等待 ${waitTime / 1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        const waitTime = delay * Math.pow(2, retries - 1);
        console.log(
          `请求失败(${error?.status || '未知错误'})，${waitTime / 1000} 秒后重试(${retries}/${maxRetries})...`
        );
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw new Error('所有重试失败');
}
