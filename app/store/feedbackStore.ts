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
  // 新增各产品响应时间数据
  productResponseTimes: {
    [key: string]: any[];
  };
  error: string | null;
  issueAnalyticsLoading: boolean;
}

// 定义所有产品
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

// 初始化状态
export const feedbackStore = proxy<FeedbackState>({
  filters: {
    startDate: dayjs().subtract(7, 'days').toISOString(),
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

// 获取GitHub Issue响应时间分析 - 并发调用多个产品API
export async function fetchIssueResponseTimes() {
  feedbackStore.issueAnalyticsLoading = true;
  feedbackStore.error = null;

  try {
    const selectedRepo = feedbackStore.filters.repo;

    // 如果没有选择具体产品，获取所有产品数据
    if (!selectedRepo) {
      // 清空之前的数据
      feedbackStore.productResponseTimes = {};
      feedbackStore.issueResponseTimes = [];

      // 并发请求所有产品数据
      const fetchPromises = ALL_PRODUCTS.map(product => fetchProductData(product.value));
      await Promise.all(fetchPromises);

      // 合并所有产品数据为总数据
      const allIssues = Object.values(feedbackStore.productResponseTimes).flat();
      feedbackStore.issueResponseTimes = allIssues;

      console.log(`获取了${allIssues.length}个跨产品Issues`);
    } else {
      // 获取单个产品数据
      await fetchProductData(selectedRepo);
    }
  } catch (error) {
    feedbackStore.error = error instanceof Error ? error.message : '未知错误';
    console.error('获取GitHub Issue数据错误:', error);
  } finally {
    feedbackStore.issueAnalyticsLoading = false;
  }
}

// 获取单个产品数据
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

    // 存储到对应产品的数据集
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
    // 确保即使单个产品请求失败也不影响其他请求
    feedbackStore.productResponseTimes[repo] = [];
    return [];
  }
}
