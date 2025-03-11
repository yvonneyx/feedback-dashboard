'use client';

import { feedbackStore } from '@/app/store/feedbackStore';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  FallOutlined,
  FileTextOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { Badge, Card, Statistic, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import { useSnapshot } from 'valtio';

const { Text } = Typography;

export default function KeyMetrics() {
  const { data, loading, issueResponseTimes, issueAnalyticsLoading, filters } =
    useSnapshot(feedbackStore);

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
      @keyframes float {
        0% { transform: translateY(0px) rotate(3deg); }
        50% { transform: translateY(-6px) rotate(5deg); }
        100% { transform: translateY(0px) rotate(3deg); }
      }
      .floating-emoji {
        animation: float 5s ease-in-out infinite;
      }
      .metric-card {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .metric-card:hover {
        transform: translateY(-3px);
      }
      .progress-bar-animation {
        transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="mb-8">
      <div className="border-b border-gray-200 pb-2 mb-4">
        <Text strong className="text-xl font-medium">
          重点指标
        </Text>
        <span className="text-xs text-gray-500 ml-2">
          ({filters.repo === '' ? 'AntV 全部产品' : filters.repo}{' '}
          {dayjs(filters.startDate).format('MM/DD')} - {dayjs(filters.endDate).format('MM/DD')})
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Issue解决率卡片 */}
        <Card
          className="rounded-xl shadow-sm hover:shadow-md transition-all duration-300 metric-card overflow-hidden border-0 group bg-gradient-to-br from-blue-50 to-white"
          variant="outlined"
          loading={issueAnalyticsLoading}
          bodyStyle={{
            padding: '16px',
            backgroundColor: 'transparent',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 背景装饰元素 */}
          <div className="absolute top-3 right-3 w-24 h-24 rounded-full bg-blue-100 opacity-20 -z-10"></div>
          <div className="absolute bottom-2 left-2 w-16 h-16 rounded-full bg-blue-100 opacity-10 -z-10"></div>

          {/* 右上角图标 */}
          <div className="absolute right-3 top-3 z-10">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border-2 border-blue-200">
              <CheckCircleOutlined className="text-[#4285F4] text-lg" />
            </div>
          </div>

          <Statistic
            title={
              <div className="flex items-center">
                <Badge color="#4285F4" />
                <Text className="text-gray-600 font-medium text-sm ml-1.5">Issue解决率</Text>
                <div className="ml-1.5">
                  <Tag
                    bordered={false}
                    style={{
                      backgroundColor: 'rgba(66, 133, 244, 0.08)',
                      color: '#1a73e8',
                      border: '1px dashed rgba(66, 133, 244, 0.3)',
                      fontWeight: 500,
                      fontSize: '10px',
                    }}
                  >
                    目标值 80%
                  </Tag>
                </div>
              </div>
            }
            value={stats.resolvedIssues.current}
            precision={1}
            valueStyle={{ color: '#1a73e8', fontWeight: '600', fontSize: '2rem' }}
            suffix={
              <div className="inline-flex items-center">
                <span className="text-gray-400 text-lg">%</span>
                <Tooltip title={`目标: ${stats.resolvedIssues.baseline}%`}>
                  {stats.resolvedIssues.isGood ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded ml-3 flex items-center">
                      <RiseOutlined className="mr-0.5" />
                      {stats.resolvedIssues.trend}
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded ml-3 flex items-center">
                      <FallOutlined className="mr-0.5" />
                      {stats.resolvedIssues.trend}
                    </span>
                  )}
                </Tooltip>
              </div>
            }
          />

          <div className="mt-2 text-[10px] text-gray-400">
            已解决: <span className="font-medium text-blue-700">{liveStats.closedIssues}</span> /
            总数: <span className="font-medium text-blue-700">{stats.resolvedIssues.total}</span>
          </div>

          <div className="mt-3 w-full h-1.5 bg-blue-50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4285F4] to-[#1a73e8] progress-bar-animation"
              style={{ width: `${stats.resolvedIssues.current}%` }}
            ></div>
          </div>
        </Card>

        {/* Issue响应率卡片 */}
        <Card
          className="rounded-xl shadow-sm hover:shadow-md transition-all duration-300 metric-card overflow-hidden border-0 group bg-gradient-to-br from-blue-50 to-white"
          variant="outlined"
          loading={issueAnalyticsLoading}
          bodyStyle={{
            padding: '16px',
            backgroundColor: 'transparent',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 背景装饰元素 */}
          <div className="absolute top-3 right-3 w-24 h-24 rounded-full bg-blue-100 opacity-20 -z-10"></div>
          <div className="absolute bottom-2 left-2 w-16 h-16 rounded-full bg-blue-100 opacity-10 -z-10"></div>

          {/* 右上角图标 */}
          <div className="absolute right-3 top-3 z-10">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border-2 border-blue-200">
              <CommentOutlined className="text-[#4285F4] text-lg" />
            </div>
          </div>

          <Statistic
            title={
              <div className="flex items-center">
                <Badge status="processing" color="#4285F4" />
                <Text className="text-gray-600 font-medium text-sm ml-1.5">Issue响应率</Text>
                <div className="ml-1.5">
                  <Tag
                    bordered={false}
                    style={{
                      backgroundColor: 'rgba(66, 133, 244, 0.08)',
                      color: '#1a73e8',
                      border: '1px dashed rgba(66, 133, 244, 0.3)',
                      fontWeight: 500,
                      fontSize: '10px',
                    }}
                  >
                    目标值 100%
                  </Tag>
                </div>
              </div>
            }
            value={stats.responseRate.current}
            precision={1}
            valueStyle={{ color: '#1a73e8', fontWeight: '600', fontSize: '2rem' }}
            suffix={
              <div className="inline-flex items-center">
                <span className="text-gray-400 text-lg">%</span>
                <Tooltip title={`目标: ${stats.responseRate.baseline}%`}>
                  {stats.responseRate.isGood ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded ml-3 flex items-center">
                      <RiseOutlined className="mr-0.5" />
                      {stats.responseRate.trend}
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded ml-3 flex items-center">
                      <FallOutlined className="mr-0.5" />
                      {stats.responseRate.trend}
                    </span>
                  )}
                </Tooltip>
              </div>
            }
          />

          <div className="mt-2 text-[10px] text-gray-400">
            已响应:{' '}
            <span className="font-medium text-blue-700">{stats.responseRate.responded}</span> /
            总数: <span className="font-medium text-blue-700">{stats.responseRate.total}</span>
          </div>

          <div className="mt-3 w-full h-1.5 bg-blue-50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4285F4] to-[#1a73e8] progress-bar-animation"
              style={{ width: `${stats.responseRate.current}%` }}
            ></div>
          </div>
        </Card>

        {/* 48小时响应率卡片 */}
        <Card
          className="rounded-xl shadow-sm hover:shadow-md transition-all duration-300 metric-card overflow-hidden border-0 group bg-gradient-to-br from-blue-50 to-white"
          variant="outlined"
          loading={issueAnalyticsLoading}
          bodyStyle={{
            padding: '16px',
            backgroundColor: 'transparent',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 背景装饰元素 */}
          <div className="absolute top-3 right-3 w-24 h-24 rounded-full bg-blue-100 opacity-20 -z-10"></div>
          <div className="absolute bottom-2 left-2 w-16 h-16 rounded-full bg-blue-100 opacity-10 -z-10"></div>

          {/* 右上角图标 */}
          <div className="absolute right-3 top-3 z-10">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border-2 border-blue-200">
              <ClockCircleOutlined className="text-[#4285F4] text-lg" />
            </div>
          </div>

          <Statistic
            title={
              <div className="flex items-center">
                <Badge status="processing" color="#4285F4" />
                <Text className="text-gray-600 font-medium text-sm ml-1.5">48小时响应率</Text>
                <div className="ml-1.5">
                  <Tag
                    bordered={false}
                    style={{
                      backgroundColor: 'rgba(66, 133, 244, 0.08)',
                      color: '#1a73e8',
                      border: '1px dashed rgba(66, 133, 244, 0.3)',
                      fontWeight: 500,
                      fontSize: '10px',
                    }}
                  >
                    目标值 95%
                  </Tag>
                </div>
              </div>
            }
            value={stats.responseRateUnder48h.current}
            precision={1}
            valueStyle={{ color: '#1a73e8', fontWeight: '600', fontSize: '2rem' }}
            suffix={
              <div className="inline-flex items-center">
                <span className="text-gray-400 text-lg">%</span>
                <Tooltip title={`目标: ${stats.responseRateUnder48h.baseline}%`}>
                  {stats.responseRateUnder48h.isGood ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded ml-3 flex items-center">
                      <RiseOutlined className="mr-0.5" />
                      {stats.responseRateUnder48h.trend}
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded ml-3 flex items-center">
                      <FallOutlined className="mr-0.5" />
                      {stats.responseRateUnder48h.trend}
                    </span>
                  )}
                </Tooltip>
              </div>
            }
          />

          <div className="mt-2 text-[10px] text-gray-400">
            48小时内响应:{' '}
            <span className="font-medium text-blue-700">
              {stats.responseRateUnder48h.responded}
            </span>{' '}
            / 总数:{' '}
            <span className="font-medium text-blue-700">{stats.responseRateUnder48h.total}</span>
          </div>

          <div className="mt-3 w-full h-1.5 bg-blue-50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4285F4] to-[#1a73e8] progress-bar-animation"
              style={{ width: `${stats.responseRateUnder48h.current}%` }}
            ></div>
          </div>
        </Card>

        {/* 文档反馈解决率卡片 */}
        <Card
          className="rounded-xl shadow-sm hover:shadow-md metric-card overflow-hidden border border-slate-100"
          loading={loading || issueAnalyticsLoading}
          variant="outlined"
          bodyStyle={{
            padding: '16px',
            backgroundColor: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="absolute right-3 top-3 z-10">
            <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
              <FileTextOutlined className="text-[#34A853] text-lg" />
            </div>
          </div>

          <Statistic
            title={
              <div className="flex items-center">
                <Badge color="#34A853" />
                <Text className="text-green-800 font-medium text-sm ml-1.5">文档反馈解决率</Text>
                <div className="ml-1.5">
                  <Tag
                    bordered={false}
                    style={{
                      backgroundColor: 'rgba(52, 168, 83, 0.08)',
                      color: '#137333',
                      border: '1px dashed rgba(52, 168, 83, 0.3)',
                      fontWeight: 500,
                      fontSize: '10px',
                    }}
                  >
                    目标值 90%
                  </Tag>
                </div>
              </div>
            }
            value={stats.resolutionRate.current}
            precision={1}
            valueStyle={{ color: '#137333', fontWeight: '600', fontSize: '2rem' }}
            suffix={
              <div className="inline-flex items-center">
                <span className="text-green-400 text-lg">%</span>
                <Tooltip title={`目标: ${stats.resolutionRate.baseline}%`}>
                  {stats.resolutionRate.isGood ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded ml-3 flex items-center">
                      <RiseOutlined className="mr-0.5" />
                      {stats.resolutionRate.trend}
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded ml-3 flex items-center">
                      <FallOutlined className="mr-0.5" />
                      {stats.resolutionRate.trend}
                    </span>
                  )}
                </Tooltip>
              </div>
            }
          />

          <div className="mt-2 text-[10px] text-green-600">
            已解决:{' '}
            <span className="font-medium text-green-800">{stats.resolutionRate.resolved}</span> /
            总数: <span className="font-medium text-green-800">{stats.resolutionRate.total}</span>
          </div>

          <div className="mt-3 w-full h-1.5 bg-green-50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#34A853] to-[#137333] progress-bar-animation"
              style={{ width: `${stats.resolutionRate.current}%` }}
            ></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
