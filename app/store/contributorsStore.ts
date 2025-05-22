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
export async function fetchContributors() {
  contributorsStore.loading = true;
  contributorsStore.error = null;

  try {
    const repos =
      contributorsStore.filters.repos.length > 0
        ? contributorsStore.filters.repos
        : ALL_PRODUCTS.map(product => product.value); // 如果未选择，则查询所有产品

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
    });

    if (!response.ok) {
      throw new Error(`获取贡献者数据失败: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Contributor[];
    contributorsStore.contributors = data;

    // 计算统计数据
    calculateStats(data);

    console.log(`获取了${data.length}个贡献者数据`);
  } catch (error) {
    contributorsStore.error = error instanceof Error ? error.message : '未知错误';
    console.error('获取贡献者数据错误:', error);
  } finally {
    contributorsStore.loading = false;
  }
}

// 计算统计数据
function calculateStats(contributors: Contributor[]) {
  // 维护者与贡献者统计
  const maintainers = contributors.filter(c => c.is_maintainer).length;
  const allContributors = contributors.length;

  // 仓库统计
  const repoStats: { [key: string]: number } = {};

  // 统计每个仓库的贡献者数量
  contributors.forEach(contributor => {
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
  contributorsStore.repoStats = repoStats;
}
