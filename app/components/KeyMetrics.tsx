'use client';

import React from 'react';
import { useSnapshot } from 'valtio';
import { Card, Badge, Typography, Statistic, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { feedbackStore } from '@/app/store/feedbackStore';

const { Text } = Typography;

export default function KeyMetrics() {
  // 获取实时数据
  const { issueResponseTimes, issueAnalyticsLoading, data, loading } = useSnapshot(feedbackStore);

  // 计算实时的开放Issue数量和48小时响应率
  const calculateLiveStats = () => {
    if (!issueResponseTimes || issueResponseTimes.length === 0) {
      return {
        openIssues: 0,
        totalIssues: 0,
        responseRate: 0,
        docCommentTotal: 0,
        docCommentResolvedRate: 0,
      };
    }

    const openIssues = issueResponseTimes.filter(issue => issue.state === 'open').length;
    const total = issueResponseTimes.length;
    const respondedWithinSLA = issueResponseTimes.filter(i => i.meetsSLA).length;
    const responseRate = total ? Math.round((respondedWithinSLA / total) * 100 * 10) / 10 : 0;
    const docCommentTotal = data?.filter(item => !item.rating).length;
    const docCommentResolvedRate = docCommentTotal
      ? Math.round(
          (data?.filter(item => !item.rating && item.isResolved === '1').length / docCommentTotal) *
            100 *
            10
        ) / 10
      : 0;

    return {
      openIssues,
      totalIssues: total,
      responseRate,
      docComments: docCommentTotal,
      docCommentResolvedRate,
    };
  };

  const liveStats = calculateLiveStats();

  // 扩展统计数据，添加基准值
  const stats = {
    openIssues: {
      current: liveStats.openIssues,
      total: liveStats.totalIssues,
    },
    responseRate: {
      current: liveStats.responseRate,
      baseline: 80,
      trend:
        liveStats.responseRate > 80
          ? `+${(liveStats.responseRate - 80).toFixed(1)}%`
          : `-${(80 - liveStats.responseRate).toFixed(1)}%`,
      isGood: liveStats.responseRate >= 80, // 数值高于基准是好的
    },
    feedbackCount: {
      current: liveStats.docComments,
    },
    resolutionRate: {
      current: liveStats.docCommentResolvedRate,
      baseline: 80,
      trend:
        liveStats.docCommentResolvedRate > 80
          ? `+${(liveStats.docCommentResolvedRate - 80).toFixed(1)}%`
          : `-${(80 - liveStats.docCommentResolvedRate).toFixed(1)}%`,
      isGood: liveStats.docCommentResolvedRate >= 80, // 数值高于基准是好的
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
    <div className="mb-6 rounded-xl overflow-hidden border-0 shadow-md bg-white">
      <div className="p-5 relative">
        <h2 className="text-base font-semibold mb-4 text-slate-700 flex items-center">
          <span className="w-1 h-4 bg-indigo-500 rounded-sm mr-2 inline-block"></span>
          核心数据指标
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Issue解决进度卡片 */}
          <Card
            className="rounded-xl shadow-sm hover:shadow-md metric-card overflow-hidden border border-slate-100"
            variant="bordered"
            loading={issueAnalyticsLoading}
            bodyStyle={{ padding: '16px', backgroundColor: '#f8faff' }}
          >
            {/* 书签式 emoji */}
            <div className="absolute -right-1 -top-1 z-10 floating-emoji">
              <div
                className="text-4xl"
                style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.1))' }}
              >
                🔄
              </div>
            </div>

            <Statistic
              title={
                <div className="flex items-center">
                  <Badge color="#3b82f6" />
                  <Text className="text-gray-500 font-medium text-xs ml-1.5">Open Issue 数量</Text>
                </div>
              }
              value={stats.openIssues.current}
              valueStyle={{ color: '#1d4ed8', fontWeight: '600', fontSize: '1.75rem' }}
              suffix={
                <span className="text-gray-400 font-normal text-base">
                  / {stats.openIssues.total}
                </span>
              }
            />

            <div className="mt-3 w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 progress-bar-animation"
                style={{
                  width: stats.openIssues.total
                    ? `${((stats.openIssues.current / stats.openIssues.total) * 100).toFixed(1)}%`
                    : '0%',
                }}
              ></div>
            </div>
          </Card>

          {/* 48小时响应率卡片 */}
          <Card
            className="rounded-xl shadow-sm hover:shadow-md metric-card overflow-hidden border border-slate-100"
            loading={issueAnalyticsLoading}
            variant="bordered"
            bodyStyle={{ padding: '16px', backgroundColor: '#f9f7ff' }}
          >
            {/* 书签式 emoji */}
            <div
              className="absolute -right-1 -top-1 z-10 floating-emoji"
              style={{ animationDelay: '0.5s' }}
            >
              <div
                className="text-4xl"
                style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.1))' }}
              >
                ⏱️
              </div>
            </div>

            <Statistic
              title={
                <div className="flex items-center">
                  <Badge status="processing" color="#6366f1" />
                  <Text className="text-gray-500 font-medium text-xs ml-1.5">48小时响应率</Text>
                </div>
              }
              value={stats.responseRate.current}
              precision={1}
              valueStyle={{ color: '#4338ca', fontWeight: '600', fontSize: '1.75rem' }}
              suffix={
                <div className="inline-flex items-center">
                  <span className="text-gray-400 text-base">%</span>
                  <span
                    className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-full ${
                      stats.responseRate.isGood
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {stats.responseRate.trend}
                    {stats.responseRate.isGood ? (
                      <ArrowUpOutlined className="ml-0.5 text-[9px]" />
                    ) : (
                      <ArrowDownOutlined className="ml-0.5 text-[9px]" />
                    )}
                  </span>
                </div>
              }
            />

            <div className="mt-3 w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 progress-bar-animation"
                style={{ width: `${stats.responseRate.current}%` }}
              ></div>
            </div>
          </Card>

          {/* 文档反馈数卡片 */}
          <Card
            className="rounded-xl shadow-sm hover:shadow-md metric-card overflow-hidden border border-slate-100"
            loading={loading || issueAnalyticsLoading}
            variant="bordered"
            bodyStyle={{ padding: '16px', backgroundColor: '#f7fefc' }}
          >
            {/* 书签式 emoji */}
            <div
              className="absolute -right-1 -top-1 z-10 floating-emoji"
              style={{ animationDelay: '1s' }}
            >
              <div
                className="text-4xl"
                style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.1))' }}
              >
                📝
              </div>
            </div>

            <Statistic
              title={
                <div className="flex items-center">
                  <Badge color="#10b981" />
                  <Text className="text-gray-500 font-medium text-xs ml-1.5">文档反馈数</Text>
                </div>
              }
              value={stats.feedbackCount.current}
              valueStyle={{ color: '#059669', fontWeight: '600', fontSize: '1.75rem' }}
            />

            <div className="mt-3 w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 progress-bar-animation"
                style={{ width: '100%' }}
              ></div>
            </div>
          </Card>

          {/* 文档反馈解决率卡片 */}
          <Card
            className="rounded-xl shadow-sm hover:shadow-md metric-card overflow-hidden border border-slate-100"
            loading={loading || issueAnalyticsLoading}
            variant="bordered"
            bodyStyle={{ padding: '16px', backgroundColor: '#fdf7ff' }}
          >
            {/* 书签式 emoji */}
            <div
              className="absolute -right-1 -top-1 z-10 floating-emoji"
              style={{ animationDelay: '1.5s' }}
            >
              <div
                className="text-4xl"
                style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.1))' }}
              >
                ✅
              </div>
            </div>

            <Statistic
              title={
                <div className="flex items-center">
                  <Badge color="#c026d3" />
                  <Text className="text-gray-500 font-medium text-xs ml-1.5">文档反馈解决率</Text>
                </div>
              }
              value={stats.resolutionRate.current}
              precision={1}
              valueStyle={{ color: '#9d174d', fontWeight: '600', fontSize: '1.75rem' }}
              suffix={
                <div className="inline-flex items-center">
                  <span className="text-gray-400 text-base">%</span>
                  <span
                    className={`text-[10px] ml-2 px-1.5 py-0.5 rounded-full ${
                      stats.resolutionRate.isGood
                        ? 'bg-fuchsia-100 text-fuchsia-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {stats.resolutionRate.trend}
                    {stats.resolutionRate.isGood ? (
                      <ArrowUpOutlined className="ml-0.5 text-[9px]" />
                    ) : (
                      <ArrowDownOutlined className="ml-0.5 text-[9px]" />
                    )}
                  </span>
                </div>
              }
            />

            <div className="mt-3 w-full h-1.5 bg-fuchsia-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-pink-500 progress-bar-animation"
                style={{ width: `${stats.resolutionRate.current}%` }}
              ></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
