import dayjs from 'dayjs';
import { proxy } from 'valtio';
import { ALL_PRODUCTS } from './feedbackStore';

// PR信息接口
export interface PullRequestInfo {
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

// PR统计数据接口
export interface PRStats {
  total: number;
  merged: number;
  open: number;
  closed: number;
  mergeRate: number;
  typeDistribution: Record<string, number>;
  repoDistribution: Record<string, number>;
  codeStats: {
    totalAdditions: number;
    totalDeletions: number;
    totalChangedFiles: number;
  };
}

// PR分析数据接口
export interface PRAnalysis {
  summary: {
    total: PRStats;
    filtered: PRStats;
  };
  details: {
    total: Record<string, PullRequestInfo[]>;
    filtered: Record<string, PullRequestInfo[]>;
  };
  rawData: PullRequestInfo[];
  timeRange: {
    startDate: string;
    endDate: string;
    fetchStartDate: string;
    fetchEndDate: string;
  };
}

// 定义全局状态
interface PRState {
  loading: boolean;
  data: PRAnalysis | null;
  error: string | null;
  filters: {
    startDate: string;
    endDate: string;
    repos: string[];
  };
}

// 初始化状态
export const prStore = proxy<PRState>({
  loading: false,
  data: null,
  error: null,
  filters: {
    startDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    repos: ALL_PRODUCTS.map(product => product.value), // 使用 ALL_PRODUCTS 中的仓库列表
  },
});

// 获取PR数据
export async function fetchPRData(
  customFilters?: {
    repos: string[];
    startDate: string;
    endDate: string;
  },
  retryCount = 0
) {
  const maxRetries = 3;
  const baseTimeout = 120000; // 2分钟基础超时
  const retryTimeout = baseTimeout + retryCount * 30000; // 每次重试增加30秒

  prStore.loading = true;

  // 只在第一次请求时清除错误
  if (retryCount === 0) {
    prStore.error = null;
  }

  try {
    // 使用传入的参数或 store 中的筛选条件
    const filters = customFilters || prStore.filters;
    const { repos, startDate, endDate } = filters;

    if (repos.length === 0) {
      throw new Error('请至少选择一个仓库');
    }

    console.log(
      `🚀 开始获取PR数据 (重试次数: ${retryCount}/${maxRetries})，选择了${repos.length}个仓库:`,
      repos
    );

    const requestBody = {
      repos: repos,
      startDate: startDate,
      endDate: endDate,
    };

    console.log('📤 发送API请求参数:', requestBody);

    // 检查网络连接状态
    if (!navigator.onLine) {
      throw new Error('网络连接已断开，请检查网络后重试');
    }

    // 设置请求超时 - 每次重试增加超时时间
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`⏰ 请求超时 (${retryTimeout / 1000}秒)，中止请求`);
      controller.abort();
    }, retryTimeout);

    const response = await fetch('/api/pull-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      // 添加请求配置增强稳健性
      cache: 'no-cache',
      keepalive: true,
    });

    // 清除超时计时器
    clearTimeout(timeoutId);

    if (!response.ok) {
      // 根据HTTP状态码提供更具体的错误信息
      let errorMessage = `获取PR数据失败: ${response.status}`;
      switch (response.status) {
        case 429:
          errorMessage = 'API请求过于频繁，请稍后再试';
          break;
        case 500:
          errorMessage = '服务器内部错误，请稍后重试';
          break;
        case 502:
        case 503:
        case 504:
          errorMessage = '服务暂时不可用，正在尝试重连...';
          break;
        default:
          errorMessage = `${errorMessage} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as PRAnalysis;

    // 验证返回的数据结构
    if (!data || typeof data !== 'object') {
      throw new Error('服务器返回了无效的数据格式');
    }

    prStore.data = data;
    prStore.error = null; // 成功后清除错误

    console.log(`✅ PR数据获取成功，共获取 ${data.rawData?.length || 0} 条PR数据`);
  } catch (error: unknown) {
    const errorObj = error as Error;
    const isAbortError = errorObj.name === 'AbortError' || errorObj.message.includes('aborted');
    const isNetworkError =
      !navigator.onLine ||
      errorObj.message.includes('fetch') ||
      errorObj.message.includes('network') ||
      errorObj.message.includes('timeout');
    const isServerError =
      errorObj.message.includes('50') ||
      errorObj.message.includes('502') ||
      errorObj.message.includes('503') ||
      errorObj.message.includes('504');

    console.error(`❌ 获取PR数据错误 (重试 ${retryCount}/${maxRetries}):`, {
      错误类型: errorObj.name,
      错误信息: errorObj.message,
      是否超时: isAbortError,
      是否网络错误: isNetworkError,
      是否服务器错误: isServerError,
    });

    // 在特定情况下进行重试
    if (retryCount < maxRetries && (isAbortError || isNetworkError || isServerError)) {
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // 指数退避，最大10秒

      prStore.error = `数据加载中，正在进行第${retryCount + 1}次重试... (${Math.ceil(retryDelay / 1000)}秒后重试)`;

      console.log(`🔄 ${retryDelay / 1000}秒后进行第${retryCount + 1}次重试...`);

      setTimeout(() => {
        fetchPRData(customFilters, retryCount + 1);
      }, retryDelay);

      return; // 提前返回，不执行 finally 块中的 loading = false
    }

    // 所有重试失败或非可重试错误
    let errorMessage = errorObj instanceof Error ? errorObj.message : '未知错误';

    // 为常见错误提供用户友好的提示
    if (isAbortError) {
      errorMessage = '请求超时，请检查网络连接后重试';
    } else if (!navigator.onLine) {
      errorMessage = '网络连接已断开，请检查网络后重试';
    } else if (errorMessage.includes('Failed to fetch')) {
      errorMessage = '网络连接失败，请检查网络后重试';
    }

    prStore.error = errorMessage;
  } finally {
    // 只有在不是重试状态时才设置 loading = false
    if (retryCount >= 3 || !prStore.error?.includes('重试')) {
      prStore.loading = false;
    }
  }
}

// 更新筛选条件
export function updatePRFilters(filters: Partial<typeof prStore.filters>) {
  Object.assign(prStore.filters, filters);
}

// 设置快捷日期范围
export function setQuickDateRange(type: 'twoWeeks' | 'oneMonth') {
  const now = dayjs();
  let startDate: dayjs.Dayjs;

  switch (type) {
    case 'twoWeeks':
      startDate = now.subtract(14, 'days');
      break;
    case 'oneMonth':
      startDate = now.subtract(1, 'month');
      break;
    default:
      startDate = now.subtract(1, 'month');
  }

  prStore.filters.startDate = startDate.format('YYYY-MM-DD');
  prStore.filters.endDate = now.format('YYYY-MM-DD');
}

// 获取PR类型的中文名称
export function getPRTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    feat: '新功能',
    fix: '修复',
    docs: '文档',
    style: '样式',
    refactor: '重构',
    test: '测试',
    chore: '构建',
    other: '其他',
  };

  return typeLabels[type] || type;
}

// 获取PR类型的颜色
export function getPRTypeColor(type: string): string {
  const typeColors: Record<string, string> = {
    feat: '#52c41a', // 绿色 - 新功能
    fix: '#ff4d4f', // 红色 - 修复
    docs: '#1890ff', // 蓝色 - 文档
    style: '#722ed1', // 紫色 - 样式
    refactor: '#faad14', // 橙色 - 重构
    test: '#13c2c2', // 青色 - 测试
    chore: '#8c8c8c', // 灰色 - 构建
    other: '#d9d9d9', // 浅灰 - 其他
  };

  return typeColors[type] || '#d9d9d9';
}
