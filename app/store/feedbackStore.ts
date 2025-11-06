import dayjs from 'dayjs';
import { proxy } from 'valtio';

// 定义全局状态
interface FeedbackState {
  filters: {
    startDate: string;
    endDate: string;
    repos: string[];
  };
  loading: boolean;
  data: any[] | null;
  githubIssues: any[] | null;
  issueResponseTimes: any[] | null;
  // 新增各仓库响应时间数据
  productResponseTimes: {
    [key: string]: any[];
  };
  // 添加数据缓存键，用于跟踪筛选条件变化
  dataCacheKeys: {
    [key: string]: string; // repo -> cacheKey (startDate-endDate)
  };
  error: string | null;
  issueAnalyticsLoading: boolean;
}

// 定义所有仓库
export const ALL_PRODUCTS = [
  { label: 'G', value: 'antvis/g' },
  { label: 'G2', value: 'antvis/g2' },
  { label: 'S2', value: 'antvis/s2' },
  { label: 'F2', value: 'antvis/f2' },
  { label: 'G6', value: 'antvis/g6' },
  { label: 'X6', value: 'antvis/x6' },
  { label: 'L7', value: 'antvis/l7' },
  { label: 'AVA', value: 'antvis/AVA' },
  { label: 'Charts', value: 'ant-design/ant-design-charts' },
  { label: 'T8', value: 'antvis/T8' },
];

// 定义各仓库指标数据接口
export interface RepoMetrics {
  repo: string;
  repoName: string;
  issueResolveRate: number;
  issue48hResponseRate: number;
  avgResponseTimeInHours: number; // 新增字段，平均响应时长（小时）
  responseRate: number; // 新增字段，响应率
  totalIssues: number;
  resolvedIssues: number;
  responded48hIssues: number;
  isIssueResolveGood: boolean;
  isIssue48hResponseGood: boolean;
}

// 定义文档反馈仓库指标接口
export interface DocRepoMetrics {
  repo: string;
  repoName: string;
  docResolveRate: number;
  totalDocs: number;
  resolvedDocs: number;
  isDocResolveGood: boolean;
}

// 初始化状态
export const feedbackStore = proxy<FeedbackState>({
  filters: {
    startDate: dayjs().startOf('month').toISOString(), // 当月第一天
    endDate: dayjs().toISOString(),
    repos: [],
  },
  loading: false,
  data: null,
  githubIssues: null,
  issueResponseTimes: null,
  productResponseTimes: {},
  dataCacheKeys: {},
  error: null,
  issueAnalyticsLoading: false,
});

// 更新筛选条件
export function updateDateRange(startDate: string, endDate: string) {
  feedbackStore.filters.startDate = startDate;
  feedbackStore.filters.endDate = endDate;
}

// 更新仓库筛选 - 修改为支持多仓库
export function updateRepos(repos: string[]) {
  feedbackStore.filters.repos = repos;
}

// 保留旧的单仓库接口以兼容现有代码
export function updateRepo(repo: string) {
  feedbackStore.filters.repos = repo ? [repo] : [];
}

// 清除Issue数据缓存，强制重新获取所有数据
export function clearIssueDataCache() {
  feedbackStore.productResponseTimes = {};
  feedbackStore.dataCacheKeys = {};
  feedbackStore.issueResponseTimes = [];
  console.log('🧹 已清除Issue数据缓存，下次查询将重新获取所有数据');
}

// 支持取消的反馈数据获取
export async function fetchFeedbackDataWithCancel(signal?: AbortSignal) {
  feedbackStore.loading = true;
  feedbackStore.error = null;

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: feedbackStore.filters.startDate,
        endDate: feedbackStore.filters.endDate,
        repos: feedbackStore.filters.repos,
      }),
      signal, // 传递AbortSignal
    });

    if (!response.ok) {
      throw new Error('Failed to fetch feedback data');
    }

    const data = await response.json();
    feedbackStore.data = data;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('⏭️ 反馈数据请求被取消');
      return; // 不设置错误状态
    }
    feedbackStore.error = error instanceof Error ? error.message : '未知错误';
    console.error('Error fetching feedback data:', error);
  } finally {
    feedbackStore.loading = false;
  }
}

// 支持取消的Issue响应时间分析 - 优化为单次请求，前端聚合
export async function fetchIssueResponseTimesWithCancel(signal?: AbortSignal) {
  feedbackStore.issueAnalyticsLoading = true;
  feedbackStore.error = null;

  try {
    const selectedRepos = feedbackStore.filters.repos;

    // 确定要查询的仓库列表
    let reposToFetch: string[];
    if (selectedRepos.length === 0) {
      reposToFetch = ALL_PRODUCTS.map(p => p.value);
    } else {
      reposToFetch = selectedRepos;
    }

    // 生成当前筛选条件的缓存键
    const currentCacheKey = `${feedbackStore.filters.startDate}-${feedbackStore.filters.endDate}`;

    // 检查哪些仓库需要重新获取数据
    const reposNeedingFetch = reposToFetch.filter(repo => {
      const hasNoData =
        !feedbackStore.productResponseTimes[repo] ||
        feedbackStore.productResponseTimes[repo].length === 0;
      const cacheKeyChanged = feedbackStore.dataCacheKeys[repo] !== currentCacheKey;

      return hasNoData || cacheKeyChanged;
    });

    console.log(`需要获取数据的仓库: ${reposNeedingFetch.length}/${reposToFetch.length}`, {
      全部仓库: reposToFetch,
      需要获取: reposNeedingFetch,
    });

    // 串行请求，避免并发超时，每个请求限制30条数据
    if (reposNeedingFetch.length > 0) {
      for (const repo of reposNeedingFetch) {
        if (signal?.aborted) {
          console.log('⏭️ 请求被取消');
          return;
        }

        await fetchProductDataSimple(repo, signal);
        feedbackStore.dataCacheKeys[repo] = currentCacheKey;

        // 添加小延迟，避免GitHub API速率限制
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // 清理不需要的仓库数据
    const reposToKeep = new Set(reposToFetch);
    Object.keys(feedbackStore.productResponseTimes).forEach(repo => {
      if (!reposToKeep.has(repo)) {
        delete feedbackStore.productResponseTimes[repo];
        delete feedbackStore.dataCacheKeys[repo];
        console.log(`清理未选中仓库的数据: ${repo}`);
      }
    });

    // 检查是否被取消
    if (signal?.aborted) {
      throw new Error('AbortError');
    }

    // 合并选中仓库的数据
    const selectedIssues = reposToFetch.flatMap(
      repo => feedbackStore.productResponseTimes[repo] || []
    );

    // API 已经完成了响应时间分析，直接使用
    feedbackStore.issueResponseTimes = selectedIssues;

    console.log(`✅ 获取了${selectedIssues.length}个Issues，覆盖${reposToFetch.length}个仓库`);
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message === 'AbortError') {
      console.log('⏭️ Issue数据请求被取消');
      return;
    }
    feedbackStore.error = error instanceof Error ? error.message : '未知错误';
    console.error('获取GitHub Issue数据错误:', error);
  } finally {
    feedbackStore.issueAnalyticsLoading = false;
  }
}

// 单个仓库数据获取 - 先获取基础数据，再在前端分析
async function fetchProductDataSimple(repo: string, signal?: AbortSignal) {
  try {
    console.log(`🔄 开始请求 ${repo} 的基础数据...`);

    // 1. 获取基础issues数据（快速）
    const response = await fetch('/api/github-issues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: feedbackStore.filters.startDate,
        endDate: feedbackStore.filters.endDate,
        repo: repo,
        limit: 30,
      }),
      signal,
    });

    console.log(`📡 ${repo} 响应状态: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`❌ ${repo} 请求失败:`, errorData);
      throw new Error(`获取${repo}数据失败: ${response.status} ${response.statusText}`);
    }

    const basicIssues = await response.json();
    console.log(`📦 ${repo} 返回基础数据:`, basicIssues.length);

    if (signal?.aborted) {
      throw new Error('AbortError');
    }

    // 2. 在前端分析响应时间（使用完整逻辑）
    console.log(`🔍 开始分析 ${repo} 的 ${basicIssues.length} 个issues...`);

    // 动态导入分析器
    const { analyzeIssuesWithDetails } = await import('../lib/issue-analyzer');

    // 分析issues（这个函数会逐个获取详细信息并分析）
    const analyzedIssues = await analyzeIssuesWithDetails(basicIssues, (current, total) => {
      console.log(`📊 ${repo} 分析进度: ${current}/${total}`);
    });

    if (signal?.aborted) {
      throw new Error('AbortError');
    }

    // 保存分析结果
    feedbackStore.productResponseTimes[repo] = analyzedIssues;

    console.log(`✅ ${repo} 分析完成: ${analyzedIssues.length} 个issues`);
    return analyzedIssues;
  } catch (error: any) {
    if (error.name === 'AbortError' || error.message === 'AbortError') {
      console.log(`⏭️ ${repo}数据请求被取消`);
      return [];
    }
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`❌ 获取${repo}数据错误:`, errorMessage);
    feedbackStore.productResponseTimes[repo] = [];
    return [];
  }
}

// 计算各仓库Issue指标 - 修改逻辑以过滤显示选中的仓库
export function calculateRepoIssueMetrics(): RepoMetrics[] {
  const repoMetrics: RepoMetrics[] = [];

  // 只有在有Issue数据时才计算各仓库指标
  if (Object.keys(feedbackStore.productResponseTimes).length === 0) {
    return repoMetrics;
  }

  // 确定要显示的仓库列表
  const reposToShow =
    feedbackStore.filters.repos.length > 0
      ? feedbackStore.filters.repos
      : ALL_PRODUCTS.map(p => p.value);

  // 遍历要显示的仓库
  reposToShow.forEach(repo => {
    const product = ALL_PRODUCTS.find(p => p.value === repo);
    if (!product) return;

    const issues = feedbackStore.productResponseTimes[repo] || [];

    const repoName = formatRepoName(repo);
    const totalIssues = issues.length;
    const resolvedIssues = issues.filter((issue: any) => issue.state === 'closed').length;
    const responded48hIssues = issues.filter(
      (issue: any) =>
        issue.hasResponse && issue.responseTimeInHours !== null && issue.responseTimeInHours <= 48
    ).length;
    // 新增：计算平均响应时长（包括未响应issue的等待时间）
    const allIssuesWithTime = issues.filter(
      (issue: any) => issue.responseTimeInHours !== null && issue.responseTimeInHours !== undefined
    );
    const avgResponseTimeInHours =
      allIssuesWithTime.length > 0
        ? Math.round(
            (allIssuesWithTime.reduce(
              (sum: number, issue: any) => sum + issue.responseTimeInHours,
              0
            ) /
              allIssuesWithTime.length) *
              10
          ) / 10
        : 0;
    // 新增：响应率（只统计已实际响应的issue）
    const respondedIssues = issues.filter((issue: any) => issue.hasResponse);
    const responseRate =
      totalIssues > 0 ? Math.round((respondedIssues.length / totalIssues) * 100) : 100;

    const issueResolveRate =
      totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 100;
    const issue48hResponseRate =
      totalIssues > 0 ? Math.round((responded48hIssues / totalIssues) * 100) : 100;

    repoMetrics.push({
      repo,
      repoName,
      issueResolveRate,
      issue48hResponseRate,
      avgResponseTimeInHours, // 新增
      responseRate, // 新增
      totalIssues,
      resolvedIssues,
      responded48hIssues,
      isIssueResolveGood: issueResolveRate >= 80,
      isIssue48hResponseGood: issue48hResponseRate >= 95,
    });
  });

  // 按仓库名排序
  return repoMetrics.sort((a, b) => a.repoName.localeCompare(b.repoName));
}

// 计算各仓库文档反馈指标 - 修改逻辑以过滤显示选中的仓库
export function calculateRepoDocMetrics(): DocRepoMetrics[] {
  const repoMetrics: DocRepoMetrics[] = [];

  // 只有在有文档反馈数据时才计算各仓库指标
  if (!feedbackStore.data) {
    return repoMetrics;
  }

  // 确定要显示的仓库列表
  const reposToShow =
    feedbackStore.filters.repos.length > 0
      ? feedbackStore.filters.repos
      : ALL_PRODUCTS.map(p => p.value);

  // 按仓库分组统计文档反馈
  const repoDocStats: { [key: string]: { total: number; resolved: number } } = {};

  // 初始化要显示的仓库的统计数据
  reposToShow.forEach(repo => {
    repoDocStats[repo] = { total: 0, resolved: 0 };
  });

  feedbackStore.data.forEach((item: any) => {
    // 只统计文档建议（非评价）
    if (item.rating) return;

    const repo = item.repo || 'unknown';
    // 只统计要显示的仓库
    if (!reposToShow.includes(repo)) return;

    if (!repoDocStats[repo]) {
      repoDocStats[repo] = { total: 0, resolved: 0 };
    }

    repoDocStats[repo].total += 1;
    if (item.isResolved === '1') {
      repoDocStats[repo].resolved += 1;
    }
  });

  // 遍历要显示的仓库
  reposToShow.forEach(repo => {
    const product = ALL_PRODUCTS.find(p => p.value === repo);
    if (!product) return;

    const stats = repoDocStats[repo] || { total: 0, resolved: 0 };
    const repoName = formatRepoName(repo);
    const docResolveRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 100;

    repoMetrics.push({
      repo,
      repoName,
      docResolveRate,
      totalDocs: stats.total,
      resolvedDocs: stats.resolved,
      isDocResolveGood: docResolveRate >= 100,
    });
  });

  // 按仓库名排序
  return repoMetrics.sort((a, b) => a.repoName.localeCompare(b.repoName));
}

// 格式化仓库名称
function formatRepoName(repo: string): string {
  if (repo === 'ant-design/ant-design-charts') return 'Charts';
  const repoName = repo.split('/').pop();
  return repoName ? repoName.toUpperCase() : repo;
}

// 懒更新:本地更新反馈状态,无需重新请求
export function updateFeedbackResolveStatus(objectId: string, resolved: boolean) {
  if (!feedbackStore.data) return;

  const item = feedbackStore.data.find(item => item.objectId === objectId);
  if (item) {
    item.isResolved = resolved ? '1' : '0';
    console.log(`✅ 本地更新反馈状态: ${objectId} -> ${resolved ? '已解决' : '未解决'}`);
  }
}

// 触发数据获取(原有版本,保持向后兼容)
export async function fetchFeedbackData() {
  return fetchFeedbackDataWithCancel();
}

// 获取GitHub Issue响应时间分析(原有版本,保持向后兼容)
export async function fetchIssueResponseTimes() {
  return fetchIssueResponseTimesWithCancel();
}
