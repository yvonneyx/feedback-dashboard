'use client';

import { feedbackStore } from '@/app/store/feedbackStore';
import { Badge, Card, Statistic, Tag, Typography } from 'antd';
import React from 'react';
import { useSnapshot } from 'valtio';

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
      baseline: 95,
      trend:
        liveStats.responseRate > 95
          ? `+${(liveStats.responseRate - 95).toFixed(1)}%`
          : `-${(95 - liveStats.responseRate).toFixed(1)}%`,
      isGood: liveStats.responseRate >= 95,
    },
    feedbackCount: {
      current: liveStats.docComments,
    },
    resolutionRate: {
      current: liveStats.docCommentResolvedRate,
      baseline: 90,
      trend:
        liveStats.docCommentResolvedRate > 90
          ? `+${(liveStats.docCommentResolvedRate - 90).toFixed(1)}%`
          : `-${(90 - liveStats.docCommentResolvedRate).toFixed(1)}%`,
      isGood: liveStats.docCommentResolvedRate >= 90,
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
          重点指标
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Issue解决进度卡片 */}
          <Card
            className="rounded-xl shadow-sm hover:shadow-lg metric-card overflow-hidden border border-slate-100 hover-lift"
            variant="outlined"
            loading={issueAnalyticsLoading}
            bodyStyle={{
              padding: '16px',
              backgroundColor: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* 右上角渐变装饰 */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-bl-[180px] bg-gradient-to-br from-[rgba(66,133,244,0.05)] to-[rgba(66,133,244,0.15)] -z-10"></div>
            {/* 左下角渐变线 */}
            <div className="absolute bottom-0 left-0 w-24 h-1 bg-gradient-to-r from-[rgba(66,133,244,0.2)] to-transparent -z-10"></div>

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
                  <Badge color="#4285F4" />
                  <Text className="text-gray-500 font-medium text-xs ml-1.5">Open Issue 数量</Text>
                </div>
              }
              value={stats.openIssues.current}
              valueStyle={{ color: '#1a73e8', fontWeight: '600', fontSize: '1.75rem' }}
              suffix={
                <span className="text-gray-400 font-normal text-base">
                  / {stats.openIssues.total}
                </span>
              }
            />

            <div className="mt-3 w-full h-1.5 bg-blue-50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4285F4] to-[#1a73e8] progress-bar-animation"
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
            variant="outlined"
            bodyStyle={{
              padding: '16px',
              backgroundColor: 'white',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* 右上角渐变装饰 */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-[160px] bg-gradient-to-br from-[rgba(66,133,244,0.05)] to-[rgba(66,133,244,0.15)] -z-10"></div>
            {/* 左侧渐变条 */}
            <div className="absolute top-6 bottom-6 left-0 w-1 bg-gradient-to-b from-[rgba(66,133,244,0.25)] via-[rgba(66,133,244,0.1)] to-[rgba(66,133,244,0.25)] -z-10"></div>

            {/* 书签式 emoji */}
            <div
              className="absolute -right-1 -top-1 z-10 floating-emoji"
              style={{ transform: 'rotate(5deg)' }}
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
                  <Badge status="processing" color="#4285F4" />
                  <Text className="text-gray-500 font-medium text-xs ml-1.5">48小时响应率</Text>
                  <div className="ml-1.5">
                    <Tag
                      bordered={false}
                      style={{
                        backgroundColor: 'rgba(66, 133, 244, 0.08)',
                        color: '#1a73e8',
                        border: '1px dashed rgba(66, 133, 244, 0.3)',
                        fontWeight: 500,
                        fontSize: '11px',
                      }}
                    >
                      目标值 95%
                    </Tag>
                  </div>
                </div>
              }
              value={stats.responseRate.current}
              precision={1}
              valueStyle={{ color: '#1a73e8', fontWeight: '600', fontSize: '1.75rem' }}
              suffix={
                <div className="inline-flex items-center">
                  <span className="text-gray-400 text-base">%</span>
                </div>
              }
            />

            <div className="mt-3 w-full h-1.5 bg-blue-50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#4285F4] to-[#1a73e8] progress-bar-animation"
                style={{ width: `${stats.responseRate.current}%` }}
              ></div>
            </div>
          </Card>

          {/* 文档反馈数卡片 */}
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
            {/* 右上角渐变装饰 */}
            <div className="absolute top-0 right-0 w-44 h-44 rounded-bl-[180px] bg-gradient-to-br from-[rgba(52,168,83,0.05)] to-[rgba(52,168,83,0.15)] -z-10"></div>
            {/* 底部渐变线 */}
            <div className="absolute bottom-0 left-4 right-4 h-1 bg-gradient-to-r from-transparent via-[rgba(52,168,83,0.15)] to-transparent -z-10"></div>

            {/* 书签式 emoji */}
            <div
              className="absolute -right-1 -top-1 z-10 floating-emoji"
              style={{ transform: 'rotate(-5deg)' }}
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
                  <Badge color="#34A853" />
                  <Text className="text-gray-500 font-medium text-xs ml-1.5">文档反馈数</Text>
                </div>
              }
              value={stats.feedbackCount.current}
              valueStyle={{ color: '#137333', fontWeight: '600', fontSize: '1.75rem' }}
            />

            <div className="mt-3 w-full h-1.5 bg-green-50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#34A853] to-[#137333] progress-bar-animation"
                style={{ width: '100%' }}
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
            {/* 右上角渐变装饰 */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-[160px] bg-gradient-to-br from-[rgba(52,168,83,0.05)] to-[rgba(52,168,83,0.15)] -z-10"></div>
            {/* 顶部渐变条 */}
            <div className="absolute top-0 left-6 right-6 h-1 bg-gradient-to-r from-[rgba(52,168,83,0.2)] via-transparent to-[rgba(52,168,83,0.2)] -z-10"></div>

            {/* 书签式 emoji */}
            <div
              className="absolute -right-1 -top-1 z-10 floating-emoji"
              style={{ transform: 'rotate(3deg)' }}
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
                  <Badge color="#34A853" />
                  <Text className="text-gray-500 font-medium text-xs ml-1.5">文档反馈解决率</Text>
                  <div className="ml-1.5">
                    <Tag
                      bordered={false}
                      style={{
                        backgroundColor: 'rgba(52, 168, 83, 0.08)',
                        color: '#137333',
                        border: '1px dashed rgba(52, 168, 83, 0.3)',
                        fontWeight: 500,
                        fontSize: '11px',
                      }}
                    >
                      目标值 90%
                    </Tag>
                  </div>
                </div>
              }
              value={stats.resolutionRate.current}
              precision={1}
              valueStyle={{ color: '#137333', fontWeight: '600', fontSize: '1.75rem' }}
              suffix={
                <div className="inline-flex items-center">
                  <span className="text-gray-400 text-base">%</span>
                </div>
              }
            />

            <div className="mt-3 w-full h-1.5 bg-green-50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#34A853] to-[#137333] progress-bar-animation"
                style={{ width: `${stats.resolutionRate.current}%` }}
              ></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
