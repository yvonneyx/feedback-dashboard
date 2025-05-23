'use client';

import { BarChartOutlined, PullRequestOutlined, TeamOutlined } from '@ant-design/icons';
import { Col, Row, Spin } from 'antd';
import { useSnapshot } from 'valtio';
import { contributorsStore } from '../store/contributorsStore';
import SimpleChart from './SimpleChart';

// 饼图数据类型
interface DataItem {
  type: string;
  value: number;
  color: string;
}

export default function ContributorsStats() {
  const { contributors, loading, maintainerStats, prStats, repoStats, filters } =
    useSnapshot(contributorsStore);

  // 如果正在加载或没有数据，显示加载状态
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spin size="large" tip="数据加载中..." />
      </div>
    );
  }

  if (!contributors || contributors.length === 0) {
    return null;
  }

  // 是否显示仓库统计（当未选择特定仓库时）
  const showRepoStats = filters.repos.length === 0 && Object.keys(repoStats).length > 0;

  // 获取排序后的仓库统计
  const sortedRepoStats = Object.entries(repoStats).sort(([, a], [, b]) => b - a);

  // 准备维护者/贡献者比例饼图数据
  const roleData: DataItem[] = [
    {
      type: '维护者',
      value: maintainerStats.maintainers,
      color: '#1677ff',
    },
    {
      type: '贡献者',
      value: maintainerStats.contributors,
      color: '#52c41a',
    },
  ];

  // 准备PR统计数据
  const prData: DataItem[] = [
    {
      type: '维护者PR',
      value: prStats.maintainerPRs,
      color: '#722ed1',
    },
    {
      type: '贡献者PR',
      value: prStats.contributorPRs,
      color: '#eb2f96',
    },
  ];

  // 准备各栈分布饼图数据
  const stackData: DataItem[] = sortedRepoStats.map(([repo, count]) => ({
    type: repo,
    value: count,
    color: getRepoColor(repo),
  }));

  return (
    <div>
      <Row gutter={16}>
        <Col xs={24} md={6}>
          <div className="rounded-lg p-4">
            <div className="text-center text-gray-600 mb-2 flex items-center justify-center">
              <TeamOutlined className="mr-2" />
              <span>总贡献者数量：{contributors.length}人</span>
            </div>
            <SimpleChart data={roleData} />
          </div>
        </Col>

        <Col xs={24} md={6}>
          <div className="rounded-lg p-4">
            <div className="text-center text-gray-600 mb-2 flex items-center justify-center">
              <PullRequestOutlined className="mr-2" />
              <span>PR数量：{prStats.total}个</span>
            </div>
            <SimpleChart data={prData} />
          </div>
        </Col>

        {showRepoStats && (
          <Col xs={24} md={12}>
            <div className="rounded-lg p-4">
              <div className="mb-3 text-center">
                <span className="text-gray-600 flex items-center justify-center">
                  <BarChartOutlined className="mr-1" />
                  各栈贡献者分布
                </span>
              </div>
              <SimpleChart data={stackData} />
            </div>
          </Col>
        )}
      </Row>
    </div>
  );
}

// 根据仓库名称返回不同的颜色
function getRepoColor(repo: string): string {
  // 为常见仓库指定固定颜色
  const colorMap: Record<string, string> = {
    G2: '#1677ff',
    G6: '#f759ab',
    L7: '#13c2c2',
    X6: '#722ed1',
    F2: '#fa8c16',
    S2: '#52c41a',
    G: '#2f54eb',
    AVA: '#eb2f96',
    CHARTS: '#faad14',
  };

  return colorMap[repo] || '#8c8c8c';
}
