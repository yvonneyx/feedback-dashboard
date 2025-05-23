'use client';

import { feedbackStore } from '@/app/store/feedbackStore';
import { FallOutlined, RiseOutlined } from '@ant-design/icons';
import { Badge, Statistic, Tag, Typography } from 'antd';
import React from 'react';
import { useSnapshot } from 'valtio';

const { Text } = Typography;

export default function KeyMetrics() {
  const { data, loading, issueResponseTimes, issueAnalyticsLoading } = useSnapshot(feedbackStore);

  // 计算实时统计数据
  const calculateLiveStats = () => {
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
        docCommentTotal: 0,
        docCommentResolvedRate: 0,
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

    // 48小时响应率
    const respondedUnder48h = issueResponseTimes.filter(
      issue => issue.responseTimeInHours !== null && issue.responseTimeInHours <= 48
    ).length;
    const responseRateUnder48h = Math.round((respondedUnder48h / total) * 100);

    const docCommentTotal = data?.filter(item => !item.rating).length || 0;
    const docCommentResolvedItems =
      data?.filter(item => !item.rating && item.isResolved === '1') || [];
    const docCommentResolvedRate = docCommentTotal
      ? Math.round((docCommentResolvedItems.length / docCommentTotal) * 100 * 10) / 10
      : 0;

    return {
      totalIssues: total,
      openIssues: open,
      closedIssues: closed,
      closureRate,
      respondedIssues,
      responseRate,
      avgResponseTime: avgTime,
      responseRateUnder48h,
      responded48h: respondedUnder48h,
      docComments: docCommentTotal,
      docCommentResolvedRate,
      docCommentResolvedItems: docCommentResolvedItems.length,
    };
  };

  const liveStats = calculateLiveStats();

  // 扩展统计数据，添加基准值
  const stats = {
    resolvedIssues: {
      current: liveStats.closureRate,
      baseline: 80,
      trend:
        liveStats.closureRate > 80
          ? `+${(liveStats.closureRate - 80).toFixed(1)}%`
          : `-${(80 - liveStats.closureRate).toFixed(1)}%`,
      isGood: liveStats.closureRate >= 80,
      total: liveStats.totalIssues,
    },
    responseRate: {
      current: liveStats.responseRate,
      baseline: 95,
      trend:
        liveStats.responseRate > 95
          ? `+${(liveStats.responseRate - 95).toFixed(1)}%`
          : `-${(95 - liveStats.responseRate).toFixed(1)}%`,
      isGood: liveStats.responseRate >= 95,
      responded: liveStats.respondedIssues,
      total: liveStats.totalIssues,
    },
    responseRateUnder48h: {
      current: liveStats.responseRateUnder48h,
      baseline: 95,
      trend:
        liveStats.responseRateUnder48h > 95
          ? `+${(liveStats.responseRateUnder48h - 95).toFixed(1)}%`
          : `-${(95 - liveStats.responseRateUnder48h).toFixed(1)}%`,
      isGood: liveStats.responseRateUnder48h >= 95,
      responded: liveStats.responded48h,
      total: liveStats.totalIssues,
    },
    resolutionRate: {
      current: liveStats.docCommentResolvedRate,
      baseline: 90,
      trend:
        liveStats.docCommentResolvedRate > 90
          ? `+${(liveStats.docCommentResolvedRate - 90).toFixed(1)}%`
          : `-${(90 - liveStats.docCommentResolvedRate).toFixed(1)}%`,
      isGood: liveStats.docCommentResolvedRate >= 90,
      resolved: liveStats.docCommentResolvedItems,
      total: liveStats.docComments,
    },
  };

  // 添加CSS到head
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .progress-bar-animation {
        transition: width 1s ease-out;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="mb-8">
      {/* <div className="border-b border-gray-200 pb-2 mb-4">
        <Text strong className="text-xl font-medium">
          重点指标
        </Text>
        <span className="text-xs text-gray-500 ml-2">
          ({filters.repo === '' ? 'AntV 全部仓库' : filters.repo}{' '}
          {dayjs(filters.startDate).format('MM/DD')} - {dayjs(filters.endDate).format('MM/DD')})
        </span>
      </div> */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Issue解决率卡片 */}
        <div
          className="rounded-lg border border-gray-100 bg-white p-4"
          style={{ opacity: issueAnalyticsLoading ? 0.6 : 1 }}
        >
          <Statistic
            title={
              <div className="flex items-center">
                <Badge color="#4285F4" />
                <Text className="text-gray-600 font-medium text-sm ml-1.5">Issue解决率</Text>
                <div className="ml-1.5">
                  <Tag bordered={false} color="blue" style={{ fontSize: '10px' }}>
                    目标值 80%
                  </Tag>
                </div>
              </div>
            }
            value={stats.resolvedIssues.current}
            precision={1}
            valueStyle={{ color: '#1a73e8', fontWeight: '600', fontSize: '1.75rem' }}
            suffix={
              <div className="inline-flex items-center">
                <span className="text-gray-400 text-base">%</span>
                {stats.resolvedIssues.isGood ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded ml-2 flex items-center">
                    <RiseOutlined className="mr-0.5" />
                    {stats.resolvedIssues.trend}
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded ml-2 flex items-center">
                    <FallOutlined className="mr-0.5" />
                    {stats.resolvedIssues.trend}
                  </span>
                )}
              </div>
            }
          />

          <div className="mt-2 text-[10px] text-gray-400">
            已解决: <span className="font-medium text-blue-700">{liveStats.closedIssues}</span> /
            总计: <span className="font-medium text-gray-600">{liveStats.totalIssues}</span>
          </div>

          {/* 进度条 */}
          <div className="mt-3 bg-gray-100 h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 progress-bar-animation"
              style={{
                width: `${stats.resolvedIssues.current > 100 ? 100 : stats.resolvedIssues.current}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Issue响应率卡片 */}
        <div
          className="rounded-lg border border-gray-100 bg-white p-4"
          style={{ opacity: issueAnalyticsLoading ? 0.6 : 1 }}
        >
          <Statistic
            title={
              <div className="flex items-center">
                <Badge color="#a855f7" />
                <Text className="text-gray-600 font-medium text-sm ml-1.5">Issue响应率</Text>
                <div className="ml-1.5">
                  <Tag bordered={false} color="purple" style={{ fontSize: '10px' }}>
                    目标值 95%
                  </Tag>
                </div>
              </div>
            }
            value={stats.responseRate.current}
            precision={1}
            valueStyle={{ color: '#9333ea', fontWeight: '600', fontSize: '1.75rem' }}
            suffix={
              <div className="inline-flex items-center">
                <span className="text-gray-400 text-base">%</span>
                {stats.responseRate.isGood ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded ml-2 flex items-center">
                    <RiseOutlined className="mr-0.5" />
                    {stats.responseRate.trend}
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded ml-2 flex items-center">
                    <FallOutlined className="mr-0.5" />
                    {stats.responseRate.trend}
                  </span>
                )}
              </div>
            }
          />

          <div className="mt-2 text-[10px] text-gray-400">
            已响应:{' '}
            <span className="font-medium text-purple-700">{stats.responseRate.responded}</span> /
            总计: <span className="font-medium text-gray-600">{stats.responseRate.total}</span>
          </div>

          {/* 进度条 */}
          <div className="mt-3 bg-gray-100 h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 progress-bar-animation"
              style={{
                width: `${stats.responseRate.current > 100 ? 100 : stats.responseRate.current}%`,
              }}
            ></div>
          </div>
        </div>

        {/* 48小时响应率卡片 */}
        <div
          className="rounded-lg border border-gray-100 bg-white p-4"
          style={{ opacity: issueAnalyticsLoading ? 0.6 : 1 }}
        >
          <Statistic
            title={
              <div className="flex items-center">
                <Badge color="#0891b2" />
                <Text className="text-gray-600 font-medium text-sm ml-1.5">48小时响应率</Text>
                <div className="ml-1.5">
                  <Tag bordered={false} color="cyan" style={{ fontSize: '10px' }}>
                    目标值 95%
                  </Tag>
                </div>
              </div>
            }
            value={stats.responseRateUnder48h.current}
            precision={1}
            valueStyle={{ color: '#0891b2', fontWeight: '600', fontSize: '1.75rem' }}
            suffix={
              <div className="inline-flex items-center">
                <span className="text-gray-400 text-base">%</span>
                {stats.responseRateUnder48h.isGood ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-cyan-50 text-cyan-600 rounded ml-2 flex items-center">
                    <RiseOutlined className="mr-0.5" />
                    {stats.responseRateUnder48h.trend}
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded ml-2 flex items-center">
                    <FallOutlined className="mr-0.5" />
                    {stats.responseRateUnder48h.trend}
                  </span>
                )}
              </div>
            }
          />

          <div className="mt-2 text-[10px] text-gray-400">
            48小时内响应:{' '}
            <span className="font-medium text-cyan-700">
              {stats.responseRateUnder48h.responded}
            </span>{' '}
            / 总计:{' '}
            <span className="font-medium text-gray-600">{stats.responseRateUnder48h.total}</span>
          </div>

          {/* 进度条 */}
          <div className="mt-3 bg-gray-100 h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 progress-bar-animation"
              style={{
                width: `${
                  stats.responseRateUnder48h.current > 100
                    ? 100
                    : stats.responseRateUnder48h.current
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* 文档反馈解决率卡片 */}
        <div
          className="rounded-lg border border-gray-100 bg-white p-4"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          <Statistic
            title={
              <div className="flex items-center">
                <Badge color="#16a34a" />
                <Text className="text-gray-600 font-medium text-sm ml-1.5">文档反馈解决率</Text>
                <div className="ml-1.5">
                  <Tag bordered={false} color="green" style={{ fontSize: '10px' }}>
                    目标值 90%
                  </Tag>
                </div>
              </div>
            }
            value={stats.resolutionRate.current}
            precision={1}
            valueStyle={{ color: '#16a34a', fontWeight: '600', fontSize: '1.75rem' }}
            suffix={
              <div className="inline-flex items-center">
                <span className="text-gray-400 text-base">%</span>
                {stats.resolutionRate.isGood ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded ml-2 flex items-center">
                    <RiseOutlined className="mr-0.5" />
                    {stats.resolutionRate.trend}
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded ml-2 flex items-center">
                    <FallOutlined className="mr-0.5" />
                    {stats.resolutionRate.trend}
                  </span>
                )}
              </div>
            }
          />

          <div className="mt-2 text-[10px] text-gray-400">
            已解决:{' '}
            <span className="font-medium text-green-700">{stats.resolutionRate.resolved}</span> /
            总计: <span className="font-medium text-gray-600">{stats.resolutionRate.total}</span>
          </div>

          {/* 进度条 */}
          <div className="mt-3 bg-gray-100 h-1 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 progress-bar-animation"
              style={{
                width: `${stats.resolutionRate.current > 100 ? 100 : stats.resolutionRate.current}%`,
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
