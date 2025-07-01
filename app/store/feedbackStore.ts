import dayjs from 'dayjs';
import { proxy } from 'valtio';

// 定义全局状态
interface FeedbackState {
  filters: {
    startDate: string;
    endDate: string;
    repo: string;
  };
  loading: boolean;
  data: any[] | null;
  githubIssues: any[] | null;
  issueResponseTimes: any[] | null;
  // 新增各仓库响应时间数据
  productResponseTimes: {
    [key: string]: any[];
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
];

// 定义各仓库指标数据接口
export interface RepoMetrics {
  repo: string;
  repoName: string;
  issueResolveRate: number;
  issue48hResponseRate: number;
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
    repo: '',
  },
  loading: false,
  data: null,
  githubIssues: null,
  issueResponseTimes: null,
  productResponseTimes: {},
  error: null,
  issueAnalyticsLoading: false,
});

// 更新筛选条件
export function updateDateRange(startDate: string, endDate: string) {
  feedbackStore.filters.startDate = startDate;
  feedbackStore.filters.endDate = endDate;
}

// 更新仓库筛选
export function updateRepo(repo: string) {
  feedbackStore.filters.repo = repo;
}

// 触发数据获取
export async function fetchFeedbackData() {
  feedbackStore.loading = true;
  feedbackStore.error = null;

  try {
    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedbackStore.filters),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch feedback data');
    }

    const data = await response.json();

    feedbackStore.data = data;
  } catch (error) {
    feedbackStore.error = error instanceof Error ? error.message : '未知错误';
    console.error('Error fetching feedback data:', error);
  } finally {
    feedbackStore.loading = false;
  }
}

// 获取GitHub Issue响应时间分析 - 并发调用多个仓库API
export async function fetchIssueResponseTimes() {
  feedbackStore.issueAnalyticsLoading = true;
  feedbackStore.error = null;

  try {
    const selectedRepo = feedbackStore.filters.repo;

    // 如果没有选择具体仓库，获取所有仓库数据
    if (!selectedRepo) {
      // 清空之前的数据
      feedbackStore.productResponseTimes = {};
      feedbackStore.issueResponseTimes = [];

      // 并发请求所有仓库数据
      const fetchPromises = ALL_PRODUCTS.map(product => fetchProductData(product.value));
      await Promise.all(fetchPromises);

      // 合并所有仓库数据为总数据
      const allIssues = Object.values(feedbackStore.productResponseTimes).flat();
      feedbackStore.issueResponseTimes = allIssues;

      console.log(`获取了${allIssues.length}个跨仓库Issues`);
    } else {
      // 获取单个仓库数据
      await fetchProductData(selectedRepo);
    }
  } catch (error) {
    feedbackStore.error = error instanceof Error ? error.message : '未知错误';
    console.error('获取GitHub Issue数据错误:', error);
  } finally {
    feedbackStore.issueAnalyticsLoading = false;
  }
}

// 获取单个仓库数据
async function fetchProductData(repo: string) {
  console.log(feedbackStore.filters);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟超时

    const response = await fetch('/api/github-issues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: feedbackStore.filters.startDate,
        endDate: feedbackStore.filters.endDate,
        repo: repo,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId); // 清除超时计时器

    if (!response.ok) {
      throw new Error(`获取${repo}数据失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log(
      `📥 ${repo} API返回数据样例:`,
      data.slice(0, 2).map((item: any) => ({
        number: item.number,
        hasResponse: item.hasResponse,
        responseTimeInHours: item.responseTimeInHours,
        meetsSLA: item.meetsSLA,
      }))
    );

    // 存储到对应仓库的数据集
    feedbackStore.productResponseTimes[repo] = data;

    // 如果是当前选择的仓库，也更新主数据集
    if (repo === feedbackStore.filters.repo) {
      feedbackStore.issueResponseTimes = data;
    }

    console.log(`获取了${data.length}个${repo} Issues`);

    return data;
  } catch (error) {
    // 更详细的错误日志
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error(`获取${repo}数据错误:`, errorMessage);
    // 确保即使单个仓库请求失败也不影响其他请求
    feedbackStore.productResponseTimes[repo] = [];
    return [];
  }
}

// 计算各仓库Issue指标
export function calculateRepoIssueMetrics(): RepoMetrics[] {
  const repoMetrics: RepoMetrics[] = [];

  // 只有在选择全部仓库时才计算各仓库指标
  if (feedbackStore.filters.repo) {
    return repoMetrics;
  }

  // 遍历所有仓库，确保每个仓库都被列出
  ALL_PRODUCTS.forEach(product => {
    const repo = product.value;
    const issues = feedbackStore.productResponseTimes[repo] || [];

    const repoName = formatRepoName(repo);
    const totalIssues = issues.length;
    const resolvedIssues = issues.filter((issue: any) => issue.state === 'closed').length;
    const responded48hIssues = issues.filter(
      (issue: any) =>
        issue.hasResponse && issue.responseTimeInHours !== null && issue.responseTimeInHours <= 48
    ).length;

    const issueResolveRate =
      totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 100;
    const issue48hResponseRate =
      totalIssues > 0 ? Math.round((responded48hIssues / totalIssues) * 100) : 100;

    repoMetrics.push({
      repo,
      repoName,
      issueResolveRate,
      issue48hResponseRate,
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

// 计算各仓库文档反馈指标
export function calculateRepoDocMetrics(): DocRepoMetrics[] {
  const repoMetrics: DocRepoMetrics[] = [];

  // 只有在选择全部仓库时才计算各仓库指标
  if (feedbackStore.filters.repo || !feedbackStore.data) {
    return repoMetrics;
  }

  // 按仓库分组统计文档反馈
  const repoDocStats: { [key: string]: { total: number; resolved: number } } = {};

  // 初始化所有仓库的统计数据
  ALL_PRODUCTS.forEach(product => {
    repoDocStats[product.value] = { total: 0, resolved: 0 };
  });

  feedbackStore.data.forEach((item: any) => {
    // 只统计文档建议（非评价）
    if (item.rating) return;

    const repo = item.repo || 'unknown';
    if (!repoDocStats[repo]) {
      repoDocStats[repo] = { total: 0, resolved: 0 };
    }

    repoDocStats[repo].total += 1;
    if (item.isResolved === '1') {
      repoDocStats[repo].resolved += 1;
    }
  });

  // 遍历所有仓库，确保每个仓库都被列出
  ALL_PRODUCTS.forEach(product => {
    const repo = product.value;
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
