'use client';

import React from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Spin,
  Typography,
  Divider,
  Tag,
  Table,
  Badge,
  Tooltip,
  Empty,
} from 'antd';
import {
  FileSearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  IssuesCloseOutlined,
  MessageOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { feedbackStore, ALL_PRODUCTS } from '../store/feedbackStore';
import { useSnapshot } from 'valtio';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

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

    // 48小时响应率
    const respondedUnder48h = issueResponseTimes.filter(issue => issue.meetsSLA).length;
    const responseRateUnder48h = Math.round((respondedUnder48h / total) * 100);

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

  // 各产品的响应时间对比数据
  const getProductComparisonData = () => {
    if (!productResponseTimes || Object.keys(productResponseTimes).length === 0) {
      return [];
    }

    return Object.entries(productResponseTimes)
      .map(([repo, issues]) => {
        if (!issues || issues.length === 0) return null;

        const total = issues.length;
        const closed = issues.filter(issue => issue.state === 'closed').length;
        const respondedUnder48h = issues.filter(issue => issue.meetsSLA).length;
        const responseRate = Math.round((respondedUnder48h / total) * 100);

        // 提取产品名称
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
      title: '产品',
      dataIndex: 'product',
      key: 'product',
      width: 150,
      render: text => (
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
      sorter: (a, b) => a.issueCount - b.issueCount,
      render: val => <span className="text-slate-600">{val}</span>,
    },
    {
      title: '已解决数量',
      dataIndex: 'closedCount',
      key: 'closedCount',
      width: 100,
      sorter: (a, b) => a.closedCount - b.closedCount,
      render: val => <span className="text-slate-600">{val}</span>,
    },
    {
      title: '解决率',
      dataIndex: 'closedRate',
      key: 'closedRate',
      width: 200,
      sorter: (a, b) => a.closedRate - b.closedRate,
      render: rate => (
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
      sorter: (a, b) => a.responsiveRate - b.responsiveRate,
      render: rate => (
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
          className="rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
          loading={issueAnalyticsLoading}
          bodyStyle={{ padding: '16px' }}
        >
          <div className="flex items-start justify-between">
            <Statistic
              title={
                <span className="text-gray-500 text-xs font-medium flex items-center">
                  <Badge status="processing" color="#4f46e5" className="mr-1" />
                  <div className="ml-1">已解决 Issue 数量</div>
                </span>
              }
              value={metrics.closedIssues}
              suffix={<span className="text-gray-400 text-sm">/ {metrics.totalIssues}</span>}
              valueStyle={{ color: '#4f46e5', fontWeight: 600, fontSize: '1.75rem' }}
            />
            <Tooltip title="已解决的 Issue 数量及占比">
              <InfoCircleOutlined className="text-gray-400 mt-1" />
            </Tooltip>
          </div>
          <div className="mt-3">
            <Progress
              percent={metrics.closureRate}
              size="small"
              strokeColor={{
                '0%': '#818cf8',
                '100%': '#4f46e5',
              }}
              className="mb-1"
            />
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <CheckCircleOutlined className="mr-1 text-indigo-500" />
              <span>解决率 {metrics.closureRate}%</span>
            </div>
          </div>
        </Card>

        {/* 新增已响应 Issue 卡片 */}
        <Card
          className="rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
          loading={issueAnalyticsLoading}
          bodyStyle={{ padding: '16px' }}
        >
          <div className="flex items-start justify-between">
            <Statistic
              title={
                <span className="text-gray-500 text-xs font-medium flex items-center">
                  <Badge status="processing" color="#3b82f6" className="mr-1" />
                  <div className="ml-1">已响应 Issue 数量</div>
                </span>
              }
              value={metrics.respondedIssues}
              suffix={<span className="text-gray-400 text-sm">/ {metrics.totalIssues}</span>}
              valueStyle={{ color: '#3b82f6', fontWeight: 600, fontSize: '1.75rem' }}
            />
            <Tooltip title="已收到社区成员响应的 Issue 数量及占比">
              <InfoCircleOutlined className="text-gray-400 mt-1" />
            </Tooltip>
          </div>
          <div className="mt-3">
            <Progress
              percent={metrics.responseRate}
              size="small"
              strokeColor={{
                '0%': '#60a5fa',
                '100%': '#2563eb',
              }}
              className="mb-1"
            />
            <div className="flex items-center text-xs text-gray-500 mt-1">
              <MessageOutlined className="mr-1 text-blue-500" />
              <span>响应率 {metrics.responseRate}%</span>
            </div>
          </div>
        </Card>

        <Card
          className="rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
          loading={issueAnalyticsLoading}
          bodyStyle={{ padding: '16px' }}
        >
          <div className="flex items-start justify-between">
            <Statistic
              title={
                <span className="text-gray-500 text-xs font-medium flex items-center">
                  <Badge status="processing" color="#10b981" className="mr-1" />
                  <div className="ml-1">48小时响应率</div>
                </span>
              }
              value={metrics.responseRateUnder48h}
              suffix="%"
              valueStyle={{ color: '#10b981', fontWeight: 600, fontSize: '1.75rem' }}
            />
            <Tooltip title="48小时内回复的 Issue 百分比">
              <InfoCircleOutlined className="text-gray-400 mt-1" />
            </Tooltip>
          </div>
          <div className="mt-3">
            <Progress
              percent={metrics.responseRateUnder48h}
              size="small"
              strokeColor={{
                '0%': '#0ed895',
                '100%': '#10b981',
              }}
              className="mb-1"
            />

            <div className="flex items-center text-xs text-gray-500 mt-1">
              <CheckCircleOutlined className="mr-1 text-emerald-500" />
              <span>目标: 80% 以上</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 产品对比分析 */}
      <Card
        className="rounded-xl border border-slate-100 shadow-sm"
        loading={issueAnalyticsLoading}
        title={
          <div className="flex items-center text-slate-700">
            <span className="text-base font-medium">产品响应率对比</span>
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
