'use client';

import { feedbackStore } from '@/app/store/feedbackStore';
import { prStore } from '@/app/store/prStore';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  FileTextOutlined,
  IssuesCloseOutlined,
  PullRequestOutlined,
} from '@ant-design/icons';
import { Col, Divider, Row, Tabs, Tag, Typography } from 'antd';
import { useSnapshot } from 'valtio';
import DocDetails from './DocDetails';
import IssueDetails from './IssueDetails';
import PRStats from './PRStats';

const { Text } = Typography;

interface DashboardMetrics {
  prs: {
    total: number;
    merged: number;
    open: number;
    mergeRate: number;
    loading: boolean;
  };
  issues: {
    total: number;
    resolved: number;
    pending: number;
    resolveRate: number;
    response48hRate: number;
    loading: boolean;
  };
  discussions: {
    total: number;
    answered: number;
    pending: number;
    answerRate: number;
    loading: boolean;
  };
}

// 管理层核心指标卡片组件
const ExecutiveMetricCard = ({
  title,
  value,
  target,
  icon,
  unit = '%',
  isGood,
  loading = false,
}: {
  title: string;
  value: number;
  target: number;
  icon: React.ReactNode;
  unit?: string;
  isGood: boolean;
  loading?: boolean;
}) => {
  const percentage = Math.min((value / target) * 100, 100);

  return (
    <div
      className={`
        relative rounded-lg p-3 shadow-sm transition-all duration-300 hover:shadow-md border
        ${
          isGood
            ? 'bg-gradient-to-br from-green-50 to-white border-green-200'
            : 'bg-gradient-to-br from-red-50 to-white border-red-200'
        }
        ${loading ? 'opacity-70' : ''}
      `}
    >
      {/* Loading 遮罩 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 rounded-lg z-10">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-xs">加载中...</span>
          </div>
        </div>
      )}

      {/* 顶部标题区域 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div
            className={`
              p-1.5 rounded-md mr-2 shadow-sm
              ${isGood ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
            `}
          >
            <div className="text-sm">{icon}</div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm mb-0">{title}</h3>
            <p className="text-xs text-gray-500">
              目标 {target}
              {unit}
            </p>
          </div>
        </div>

        {/* 状态徽章 */}
        <div
          className={`
            px-2 py-0.5 rounded-full text-xs font-medium
            ${isGood ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
          `}
        >
          {isGood ? '达标' : '待改进'}
        </div>
      </div>

      {/* 核心数值区域 */}
      <div className="text-center mb-2">
        <div className="flex items-baseline justify-center">
          <span
            className={`
              text-2xl font-bold
              ${isGood ? 'text-green-600' : 'text-red-600'}
            `}
          >
            {value.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500 ml-1">{unit}</span>
        </div>

        {/* 差距提示 */}
        <div className="mt-0.5">
          {value >= target ? (
            <span className="text-xs text-green-600 font-medium">
              超出 {(value - target).toFixed(1)}
              {unit}
            </span>
          ) : (
            <span className="text-xs text-red-600 font-medium">
              还差 {(target - value).toFixed(1)}
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-600">
          <span>进度</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`
              h-full rounded-full transition-all duration-500 ease-out
              ${
                isGood
                  ? 'bg-gradient-to-r from-green-400 to-green-500'
                  : 'bg-gradient-to-r from-red-400 to-red-500'
              }
            `}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* 装饰性背景图案 */}
      <div
        className={`
          absolute top-0 right-0 w-12 h-12 opacity-5 rounded-bl-full
          ${isGood ? 'bg-green-500' : 'bg-red-500'}
        `}
      />
    </div>
  );
};

export default function CommunityDashboard() {
  const prData = useSnapshot(prStore);
  const feedbackData = useSnapshot(feedbackStore);

  // 计算48小时响应率
  const calculate48hResponseRate = (issues: readonly any[]) => {
    if (!issues || issues.length === 0) return 100; // 没有Issue时，认为响应率为100%

    console.log('🔍 计算48小时响应率，总issue数量:', issues.length);

    const responded48h = issues.filter(issue => {
      // 使用正确的字段名：hasResponse 和 responseTimeInHours
      const isValid =
        issue.hasResponse && issue.responseTimeInHours !== null && issue.responseTimeInHours <= 48;

      if (issue.hasResponse && issue.responseTimeInHours !== null) {
        console.log(
          `📋 Issue #${issue.number}: 响应时间=${issue.responseTimeInHours}小时, 符合48h: ${isValid ? '✅' : '❌'}`
        );
      } else if (!issue.hasResponse) {
        console.log(`📋 Issue #${issue.number}: 未响应`);
      }

      return isValid;
    });

    const rate = Math.round((responded48h.length / issues.length) * 100);
    console.log(`📊 48小时响应率计算结果: ${responded48h.length}/${issues.length} = ${rate}%`);

    return rate;
  };

  // 获取当前筛选条件下的文档反馈数据
  const getFilteredDiscussions = () => {
    if (!feedbackData.data) return [];

    // 如果选择了特定仓库，只显示该仓库的数据
    if (feedbackData.filters.repo && feedbackData.filters.repo !== '') {
      return feedbackData.data.filter((item: any) => {
        // 根据API中的查询条件，使用 repo 字段进行筛选
        return item.repo === feedbackData.filters.repo;
      });
    }

    return feedbackData.data;
  };

  // 计算各个维度的指标
  const filteredDiscussions = getFilteredDiscussions();

  // 计算文档建议相关指标
  const docSuggestions = filteredDiscussions.filter(
    (item: any) => !item.rating && item.isResolved === '0'
  );
  const allSuggestions = filteredDiscussions.filter((item: any) => !item.rating); // 所有文档建议（包括已处理和未处理）
  const resolvedSuggestions = filteredDiscussions.filter(
    (item: any) => !item.rating && item.isResolved === '1'
  );
  const suggestionProcessRate =
    allSuggestions.length > 0
      ? Math.round((resolvedSuggestions.length / allSuggestions.length) * 100)
      : 100; // 没有文档建议时，认为处理率为100%

  const metrics: DashboardMetrics = {
    prs: {
      total: prData.data?.summary.filtered.total || 0,
      merged: prData.data?.summary.filtered.merged || 0,
      open: prData.data?.summary.filtered.open || 0,
      mergeRate: prData.data?.summary.filtered.mergeRate || 0,
      loading: prData.loading,
    },
    issues: {
      total: feedbackData.issueResponseTimes?.length || 0,
      resolved:
        feedbackData.issueResponseTimes?.filter((issue: any) => issue.state === 'closed').length ||
        0,
      pending:
        feedbackData.issueResponseTimes?.filter((issue: any) => issue.state === 'open').length || 0,
      resolveRate: 0,
      response48hRate: calculate48hResponseRate([...(feedbackData.issueResponseTimes || [])]),
      loading: feedbackData.issueAnalyticsLoading,
    },
    discussions: {
      total: allSuggestions.length, // 所有文档建议数量
      answered: resolvedSuggestions.length, // 已处理的文档建议
      pending: docSuggestions.length, // 待处理的文档建议
      answerRate: suggestionProcessRate, // 文档建议处理率
      loading: feedbackData.loading,
    },
  };

  // 计算解决率和回答率
  metrics.issues.resolveRate =
    metrics.issues.total > 0
      ? Math.round((metrics.issues.resolved / metrics.issues.total) * 100)
      : 100; // 没有Issue时，认为解决率为100%

  metrics.discussions.answerRate =
    metrics.discussions.total > 0
      ? Math.round((metrics.discussions.answered / metrics.discussions.total) * 100)
      : 100; // 没有文档建议时，认为处理率为100%

  // 计算管理层关注的核心指标
  const calculateExecutiveMetrics = () => {
    // Issue 解决率
    const issueResolveRate = metrics.issues.resolveRate;

    // Issue 48h 响应率
    const issue48hResponseRate = metrics.issues.response48hRate;

    // 文档解决率
    const docResolveRate = metrics.discussions.answerRate;

    return {
      issueResolveRate,
      issue48hResponseRate,
      docResolveRate,
    };
  };

  const executiveMetrics = calculateExecutiveMetrics();

  return (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <ExecutiveMetricCard
            title="Issue 解决率"
            value={executiveMetrics.issueResolveRate}
            target={80}
            icon={<CheckCircleOutlined />}
            isGood={executiveMetrics.issueResolveRate >= 80}
            loading={feedbackData.issueAnalyticsLoading}
          />
        </Col>

        <Col xs={24} lg={8}>
          <ExecutiveMetricCard
            title="Issue 48h 响应率"
            value={executiveMetrics.issue48hResponseRate}
            target={100}
            icon={<ClockCircleOutlined />}
            isGood={executiveMetrics.issue48hResponseRate >= 100}
            loading={feedbackData.issueAnalyticsLoading}
          />
        </Col>

        <Col xs={24} lg={8}>
          <ExecutiveMetricCard
            title="文档解决率"
            value={executiveMetrics.docResolveRate}
            target={100}
            icon={<FileTextOutlined />}
            isGood={executiveMetrics.docResolveRate >= 100}
            loading={feedbackData.loading}
          />
        </Col>
      </Row>

      <Divider />

      {/* 详情面板 - Tabs布局 */}
      <Tabs
        defaultActiveKey="prs"
        className="custom-tabs"
        items={[
          {
            key: 'prs',
            label: (
              <div className="flex items-center px-2">
                <PullRequestOutlined className="text-slate-600 mr-2" />
                <span className="font-medium text-slate-700">Pull Requests</span>
                <div className="ml-3 flex items-center space-x-2">
                  <Text type="secondary" className="text-xs">
                    {metrics.prs.total}个 · 合并率{metrics.prs.mergeRate}%
                  </Text>
                  <Tag color="blue" className="border-blue-300 text-blue-600 rounded-full text-xs">
                    {metrics.prs.total}
                  </Tag>
                </div>
              </div>
            ),
            children: (
              <div className="p-6">
                <PRStats />
              </div>
            ),
          },
          {
            key: 'issues',
            label: (
              <div className="flex items-center px-2">
                <IssuesCloseOutlined className="text-slate-600 mr-2" />
                <span className="font-medium text-slate-700">Issues</span>
                <div className="ml-3 flex items-center space-x-2">
                  <Text type="secondary" className="text-xs">
                    {metrics.issues.total}个 · 48h响应{metrics.issues.response48hRate}%
                  </Text>
                  <Tag
                    color="orange"
                    className="border-orange-300 text-orange-600 rounded-full text-xs"
                  >
                    {metrics.issues.total}
                  </Tag>
                </div>
              </div>
            ),
            children: (
              <div className="p-6">
                <IssueDetails />
              </div>
            ),
          },
          {
            key: 'docs',
            label: (
              <div className="flex items-center px-2">
                <CommentOutlined className="text-slate-600 mr-2" />
                <span className="font-medium text-slate-700">文档建议</span>
                <div className="ml-3 flex items-center space-x-2">
                  <Text type="secondary" className="text-xs">
                    {metrics.discussions.total}个 · 处理率{metrics.discussions.answerRate}%
                  </Text>
                  <Tag
                    color="green"
                    className="border-green-300 text-green-600 rounded-full text-xs"
                  >
                    {metrics.discussions.total}
                  </Tag>
                </div>
              </div>
            ),
            children: (
              <div className="p-6">
                <DocDetails />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
