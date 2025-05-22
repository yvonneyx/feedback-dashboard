'use client';

import { Badge, Card, Empty, Progress, Spin, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useSnapshot } from 'valtio';
import { feedbackStore } from '../store/feedbackStore';

const { Text } = Typography;

export default function IssueMetrics() {
  const { issueResponseTimes, productResponseTimes, issueAnalyticsLoading, filters } =
    useSnapshot(feedbackStore);

  const calculateMetrics = () => {
    if (!issueResponseTimes || issueResponseTimes.length === 0) {
      return {
        totalIssues: 0,
        openIssues: 0,
        closedIssues: 0,
        closureRate: 0,
        respondedIssues: 0,
        responseRate: 0,
        avgResponseTime: 0,
        responseRateUnder48h: 0,
      };
    }

    const total = issueResponseTimes.length;
    const open = issueResponseTimes.filter(issue => issue.state === 'open').length;
    const closed = total - open;
    const closureRate = Math.round((closed / total) * 100);

    // 已响应 Issue 数量
    const respondedIssues = issueResponseTimes.filter(
      issue => issue.responseTimeInHours !== null
    ).length;
    const responseRate = Math.round((respondedIssues / total) * 100);

    // 有效响应时间统计
    const validResponseTimes = issueResponseTimes
      .filter(issue => issue.responseTimeInHours !== null)
      .map(issue => issue.responseTimeInHours);

    const avgTime =
      validResponseTimes.length > 0
        ? Math.round(
            validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length
          )
        : 0;

    // 48小时响应率 - 修正计算逻辑
    const respondedUnder48h = issueResponseTimes.filter(issue => {
      // 明确检查 hasResponse 和 responseTimeInHours
      return (
        issue.hasResponse && issue.responseTimeInHours !== null && issue.responseTimeInHours <= 48
      );
    }).length;

    // 确保分母是总issues数而不是只有响应的issues
    const responseRateUnder48h = total > 0 ? Math.round((respondedUnder48h / total) * 100) : 0;

    console.log(`48小时响应率计算: ${respondedUnder48h}/${total} = ${responseRateUnder48h}%`);

    return {
      totalIssues: total,
      openIssues: open,
      closedIssues: closed,
      closureRate,
      respondedIssues,
      responseRate,
      avgResponseTime: avgTime,
      responseRateUnder48h: responseRateUnder48h,
    };
  };

  const metrics = calculateMetrics();

  // 各仓库的响应时间对比数据
  const getProductComparisonData = () => {
    if (!productResponseTimes || Object.keys(productResponseTimes).length === 0) {
      return [];
    }

    return Object.entries(productResponseTimes)
      .map(([repo, issues]) => {
        if (!issues || issues.length === 0) return null;

        const total = issues.length;
        const closed = issues.filter(issue => issue.state === 'closed').length;

        // 修正 respondedUnder48h 计算
        const respondedUnder48h = issues.filter(issue => {
          return (
            issue.hasResponse &&
            issue.responseTimeInHours !== null &&
            issue.responseTimeInHours <= 48
          );
        }).length;

        const responseRate = total > 0 ? Math.round((respondedUnder48h / total) * 100) : 0;

        // 提取仓库名称
        const productName = repo.split('/').pop()?.toUpperCase() || repo;

        return {
          product: productName,
          issueCount: total,
          closedCount: closed,
          closedRate: Math.round((closed / total) * 100),
          responsiveRate: responseRate,
          key: repo,
        };
      })
      .filter(Boolean);
  };

  const productComparisonData = getProductComparisonData();

  const comparisonColumns = [
    {
      title: '仓库',
      dataIndex: 'product',
      key: 'product',
      width: 150,
      render: (text: string) => (
        <Text strong className="text-slate-700">
          {text}
        </Text>
      ),
    },
    {
      title: `新增 Issue 数`,
      dataIndex: 'issueCount',
      key: 'issueCount',
      width: 150,
      sorter: (a: any, b: any) => a.issueCount - b.issueCount,
      render: (val: number) => <span className="text-slate-600">{val}</span>,
    },
    {
      title: '已解决数量',
      dataIndex: 'closedCount',
      key: 'closedCount',
      width: 100,
      sorter: (a: any, b: any) => a.closedCount - b.closedCount,
      render: (val: number) => <span className="text-slate-600">{val}</span>,
    },
    {
      title: '解决率',
      dataIndex: 'closedRate',
      key: 'closedRate',
      width: 200,
      sorter: (a: any, b: any) => a.closedRate - b.closedRate,
      render: (rate: number) => (
        <div className="flex items-center">
          <Progress
            percent={rate}
            size="small"
            strokeColor={rate >= 80 ? '#4ade80' : rate >= 60 ? '#facc15' : '#94a3b8'}
            className="mr-2 w-16"
          />
        </div>
      ),
    },
    {
      title: '48小时响应率',
      dataIndex: 'responsiveRate',
      key: 'responsiveRate',
      width: 200,
      sorter: (a: any, b: any) => a.responsiveRate - b.responsiveRate,
      render: (rate: number) => (
        <div className="flex items-center">
          <Progress
            percent={rate}
            size="small"
            strokeColor={rate >= 80 ? '#4ade80' : rate >= 60 ? '#facc15' : '#ef4444'}
            className="mr-2 w-16"
          />
        </div>
      ),
    },
  ];

  return issueAnalyticsLoading ? (
    <div className="flex items-center justify-center py-16">
      <Spin size="large" tip="数据加载中..." />
    </div>
  ) : (
    <div className="space-y-5">
      {/* 顶部卡片统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="rounded-lg border border-gray-100 bg-white"
          bodyStyle={{ padding: '14px' }}
        >
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center">
              <Badge color="#4f46e5" />
              <Text className="text-gray-600 text-xs font-medium ml-1.5">已解决 Issue</Text>
            </div>
            <Badge
              className="bg-indigo-100 text-indigo-600 rounded-full px-1.5 py-0.5"
              count={`${metrics.closureRate}%`}
              style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}
            />
          </div>

          <div className="flex items-baseline mt-1">
            <span className="text-indigo-700 font-semibold text-xl">{metrics.closedIssues}</span>
            <span className="text-gray-400 text-xs ml-1.5">/ {metrics.totalIssues}</span>
          </div>

          <Progress
            percent={metrics.closureRate}
            size="small"
            strokeColor="#4f46e5"
            className="mt-2 mb-0"
            showInfo={false}
          />
        </Card>

        <Card
          className="rounded-lg border border-gray-100 bg-white"
          bodyStyle={{ padding: '14px' }}
        >
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center">
              <Badge color="#3b82f6" />
              <Text className="text-gray-600 text-xs font-medium ml-1.5">已响应 Issue</Text>
            </div>
            <Badge
              className="bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5"
              count={`${metrics.responseRate}%`}
              style={{ backgroundColor: '#dbeafe', color: '#3b82f6' }}
            />
          </div>

          <div className="flex items-baseline mt-1">
            <span className="text-blue-600 font-semibold text-xl">{metrics.respondedIssues}</span>
            <span className="text-gray-400 text-xs ml-1.5">/ {metrics.totalIssues}</span>
          </div>

          <Progress
            percent={metrics.responseRate}
            size="small"
            strokeColor="#3b82f6"
            className="mt-2 mb-0"
            showInfo={false}
          />
        </Card>

        <Card
          className="rounded-lg border border-gray-100 bg-white"
          bodyStyle={{ padding: '14px' }}
        >
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center">
              <Badge color="#10b981" />
              <Text className="text-gray-600 text-xs font-medium ml-1.5">48小时响应率</Text>
            </div>
            <Badge
              className="bg-emerald-100 text-emerald-600 rounded-full px-1.5 py-0.5"
              count={`${metrics.responseRateUnder48h}%`}
              style={{ backgroundColor: '#d1fae5', color: '#10b981' }}
            />
          </div>

          <div className="flex items-baseline mt-1">
            <span className="text-emerald-600 font-semibold text-xl">
              {
                issueResponseTimes?.filter(
                  issue =>
                    issue.hasResponse &&
                    issue.responseTimeInHours !== null &&
                    issue.responseTimeInHours <= 48
                ).length
              }
            </span>
            <span className="text-gray-400 text-xs ml-1.5">/ {metrics.totalIssues}</span>
          </div>

          <Progress
            percent={metrics.responseRateUnder48h}
            size="small"
            strokeColor="#10b981"
            className="mt-2 mb-0"
            showInfo={false}
          />
        </Card>
      </div>

      {/* 仓库对比分析 */}
      <Card
        className="rounded-lg border border-gray-100"
        title={
          <div className="flex items-center text-slate-700">
            <span className="text-sm font-medium">仓库响应率对比</span>
            <span className="text-xs text-gray-500 ml-2">
              ({dayjs(filters.startDate).format('MM/DD')} - {dayjs(filters.endDate).format('MM/DD')}
              )
            </span>
          </div>
        }
        bodyStyle={{ padding: '0.75rem' }}
      >
        {productComparisonData.length > 0 ? (
          <Table
            dataSource={productComparisonData}
            columns={comparisonColumns}
            pagination={false}
            size="small"
            className="rounded-lg overflow-hidden"
          />
        ) : (
          <Empty description="暂无对比数据" image={Empty.PRESENTED_IMAGE_SIMPLE} className="py-4" />
        )}
      </Card>
    </div>
  );
}
