import dayjs from 'dayjs';
import { proxy } from 'valtio';
import { ALL_PRODUCTS } from './feedbackStore';

// 贡献者角色类型
export type ContributorRole =
  | 'OWNER'
  | 'MEMBER'
  | 'COLLABORATOR'
  | 'CONTRIBUTOR'
  | 'FIRST_TIME_CONTRIBUTOR'
  | 'FIRST_TIMER'
  | 'NONE';

// 贡献者信息接口
export interface Contributor {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  contributions: number;
  role: ContributorRole;
  repos: string[]; // 参与的仓库列表
  is_maintainer: boolean;
  pull_requests?: number; // 提交的PR数量
}

// 定义全局状态
interface ContributorsState {
  filters: {
    startDate: string;
    endDate: string;
    repos: string[];
  };
  loading: boolean;
  contributors: Contributor[] | null;
  error: string | null;
  maintainerStats: {
    maintainers: number;
    contributors: number;
  };
  prStats: {
    maintainerPRs: number;
    contributorPRs: number;
    total: number;
  };
  repoStats: {
    [key: string]: number;
  };
}

// 初始化状态
export const contributorsStore = proxy<ContributorsState>({
  filters: {
    startDate: dayjs().startOf('year').format('YYYY-MM-DD'), // 默认从今年1月1日开始
    endDate: dayjs().format('YYYY-MM-DD'),
    repos: [],
  },
  loading: false,
  contributors: null,
  error: null,
  maintainerStats: {
    maintainers: 0,
    contributors: 0,
  },
  prStats: {
    maintainerPRs: 0,
    contributorPRs: 0,
    total: 0,
  },
  repoStats: {},
});

// 更新日期范围
export function updateContributorDateRange(startDate: string, endDate: string) {
  contributorsStore.filters.startDate = startDate;
  contributorsStore.filters.endDate = endDate;
}

// 更新仓库选择
export function updateSelectedRepos(repos: string[]) {
  contributorsStore.filters.repos = repos;
}

// 获取贡献者数据
export async function fetchContributors(retryCount = 0) {
  contributorsStore.loading = true;
  contributorsStore.error = null;

  try {
    const repos =
      contributorsStore.filters.repos.length > 0
        ? contributorsStore.filters.repos
        : ALL_PRODUCTS.map(product => product.value); // 如果未选择，则查询所有仓库

    console.log(`开始获取贡献者数据，选择了${repos.length}个仓库`);

    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3分钟超时

    const response = await fetch('/api/contributors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: contributorsStore.filters.startDate,
        endDate: contributorsStore.filters.endDate,
        repos: repos,
      }),
      signal: controller.signal,
    });

    // 清除超时计时器
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`获取贡献者数据失败: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Contributor[];
    contributorsStore.contributors = data;

    // 计算统计数据
    calculateStats(data);

    console.log(`获取了${data.length}个贡献者数据`);
  } catch (error: any) {
    // 如果是超时或网络错误，尝试重试
    if (
      (error.name === 'AbortError' ||
        error.message.includes('504') ||
        error.message.includes('timeout')) &&
      retryCount < 2
    ) {
      console.log(`请求超时或网络错误，正在进行第${retryCount + 1}次重试...`);
      contributorsStore.error = `数据加载中，正在进行第${retryCount + 1}次重试...`;

      // 延迟重试
      setTimeout(() => {
        fetchContributors(retryCount + 1);
      }, 3000);
      return;
    }

    contributorsStore.error = error instanceof Error ? error.message : '未知错误';
    console.error('获取贡献者数据错误:', error);
  } finally {
    if (contributorsStore.error !== `数据加载中，正在进行第${retryCount + 1}次重试...`) {
      contributorsStore.loading = false;
    }
  }
}

// 计算统计数据
function calculateStats(contributors: Contributor[]) {
  // 维护者与贡献者统计
  const maintainers = contributors.filter(c => c.is_maintainer).length;
  const allContributors = contributors.length;

  // PR统计
  let maintainerPRs = 0;
  let contributorPRs = 0;

  // 仓库统计
  const repoStats: { [key: string]: number } = {};

  // 统计每个仓库的贡献者数量和PR数量
  contributors.forEach(contributor => {
    // 累计PR数量（如果有）
    if (contributor.pull_requests) {
      if (contributor.is_maintainer) {
        maintainerPRs += contributor.pull_requests;
      } else {
        contributorPRs += contributor.pull_requests;
      }
    }

    contributor.repos.forEach(repo => {
      // 提取仓库名称（如 antvis/g2 -> g2）
      const repoName = repo.split('/').pop()?.toUpperCase() || repo;

      if (!repoStats[repoName]) {
        repoStats[repoName] = 0;
      }
      repoStats[repoName] += 1;
    });
  });

  // 更新store
  contributorsStore.maintainerStats = {
    maintainers: maintainers,
    contributors: allContributors - maintainers,
  };
  contributorsStore.prStats = {
    maintainerPRs,
    contributorPRs,
    total: maintainerPRs + contributorPRs,
  };
  contributorsStore.repoStats = repoStats;
}
