'use client';

import {
  calculateRepoDocMetrics,
  calculateRepoIssueMetrics,
  feedbackStore,
} from '@/app/store/feedbackStore';
import { prStore } from '@/app/store/prStore';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  FileTextOutlined,
  IssuesCloseOutlined,
  PullRequestOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Col, Divider, Row, Tabs, Tooltip } from 'antd';
import { useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import DocDetails from './DocDetails';
import IssueDetails from './IssueDetails';
import MonthlyIssueStats from './MonthlyIssueStats';
import PRStats from './PRStats';

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
  showRepoTable = false,
  repoTableData = [],
  repoTableType = 'issue',
  filters,
  showGap = true,
  showProgress = true,
  ruleDescription,
}: {
  title: string;
  value: number;
  target: number;
  icon: React.ReactNode;
  unit?: string;
  isGood: boolean;
  loading?: boolean;
  showRepoTable?: boolean;
  repoTableData?: any[];
  repoTableType?: 'issue' | 'doc' | 'issue48h';
  filters?: { repos: readonly string[] };
  showGap?: boolean;
  showProgress?: boolean;
  ruleDescription?: string;
}) => {
  // 添加调试日志
  console.log(`🎯 ExecutiveMetricCard [${title}]:`, {
    value,
    target,
    isGood,
    loading,
    repoTableDataLength: repoTableData.length,
  });

  const percentage = Math.min((value / target) * 100, 100);

  // 获取表格列配置
  const getTableColumns = () => {
    const baseColumns = [
      {
        title: '仓库',
        dataIndex: 'repoName' as keyof any,
        key: 'repoName',
        width: 80,
        render: (text: string) => <span className="font-medium text-gray-700">{text}</span>,
      },
    ];

    if (repoTableType === 'issue') {
      return [
        ...baseColumns,
        {
          title: '解决率',
          dataIndex: 'issueResolveRate' as keyof any,
          key: 'issueResolveRate',
          width: 80,
          render: (rate: number, record: any) => (
            <span
              className={`font-semibold ${
                record.isIssueResolveGood ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {record.totalIssues ? `${rate}%` : '-'}
            </span>
          ),
        },
        {
          title: '已解决/总数',
          key: 'resolved',
          width: 100,
          render: (_: any, record: any) => (
            <span className="text-sm text-gray-600">
              {record.resolvedIssues}/{record.totalIssues}
            </span>
          ),
        },
        {
          title: '状态',
          key: 'status',
          width: 60,
          render: (_: any, record: any) => (
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                record.isIssueResolveGood ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          ),
        },
      ];
    }

    if (repoTableType === 'issue48h') {
      return [
        ...baseColumns,
        {
          title: '平均响应时长（小时）',
          key: 'avgResponseTimeInHours',
          width: 160,
          render: (_: any, record: any) => (
            <span
              className={`font-semibold ${
                record.avgResponseTimeInHours <= target ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {record.totalIssues ? `${record.avgResponseTimeInHours.toFixed(1)}h` : '-'}
            </span>
          ),
        },
        {
          title: '响应率',
          key: 'responseRate',
          width: 100,
          render: (_: number, record: any) => (
            <span className="text-sm text-gray-600">
              {record.totalIssues ? `${record.responseRate}%` : '-'}
            </span>
          ),
        },
        {
          title: '48h响应率',
          key: 'responded',
          width: 120,
          render: (_: any, record: any) => (
            <span className="text-sm text-gray-600">
              {record.totalIssues
                ? `${((record.responded48hIssues / record.totalIssues) * 100).toFixed(0)}%`
                : '-'}
            </span>
          ),
        },
        {
          title: '状态',
          key: 'status',
          width: 60,
          render: (_: any, record: any) => (
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                record.avgResponseTimeInHours <= target ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          ),
        },
      ];
    }

    if (repoTableType === 'doc') {
      return [
        ...baseColumns,
        {
          title: '解决率',
          dataIndex: 'docResolveRate' as keyof any,
          key: 'docResolveRate',
          width: 80,
          render: (rate: number, record: any) => (
            <span
              className={`font-semibold ${
                record.isDocResolveGood ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {record.totalDocs ? `${rate}%` : '-'}
            </span>
          ),
        },
        {
          title: '已解决/总数',
          key: 'resolved',
          width: 100,
          render: (_: any, record: any) => (
            <span className="text-sm text-gray-600">
              {record.resolvedDocs}/{record.totalDocs}
            </span>
          ),
        },
        {
          title: '状态',
          key: 'status',
          width: 60,
          render: (_: any, record: any) => (
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                record.isDocResolveGood ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
          ),
        },
      ];
    }

    return baseColumns;
  };

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
            <div className="flex items-center">
              <h3 className="font-semibold text-gray-800 text-sm mb-0">{title}</h3>
              {ruleDescription && (
                <Tooltip title={ruleDescription} placement="top">
                  <QuestionCircleOutlined className="ml-1 text-gray-400 text-xs hover:text-gray-600 cursor-help" />
                </Tooltip>
              )}
            </div>
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
        {showGap && (
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
        )}
      </div>

      {/* 进度条 */}
      {showProgress ? (
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
      ) : (
        <div style={{ height: '36px' }}></div>
      )}

      {/* 仓库指标表格 */}
      {showRepoTable && repoTableData.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600 mb-2 font-medium">
            {filters?.repos && filters.repos.length > 0
              ? `已选中 ${filters.repos.length} 个仓库的指标`
              : '各仓库指标'}
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                {getTableColumns().map((col, index) => (
                  <th
                    key={col.key || index}
                    className="px-2 py-1 text-left font-medium text-gray-700 border-b"
                    style={{ width: col.width }}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repoTableData.map(record => (
                <tr key={record.repo} className="hover:bg-gray-50">
                  {getTableColumns().map((col, colIndex) => {
                    let cellContent: React.ReactNode = '';

                    // @ts-expect-error type error
                    if (col.dataIndex) {
                      // @ts-expect-error type error
                      const value = record[col.dataIndex as string];
                      cellContent = col.render ? (col.render as any)(value, record) : value;
                    } else if (col.render) {
                      cellContent = (col.render as any)(undefined, record);
                    }

                    return (
                      <td key={col.key || colIndex} className="px-2 py-1 border-b border-gray-100">
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

  // 添加数据变化监听和调试
  useEffect(() => {
    console.log('🎯 CommunityDashboard数据变化监听:', {
      feedbackData: {
        loading: feedbackData.loading,
        issueAnalyticsLoading: feedbackData.issueAnalyticsLoading,
        data: feedbackData.data?.length || 0,
        issueResponseTimes: feedbackData.issueResponseTimes?.length || 0,
        productResponseTimes: Object.keys(feedbackData.productResponseTimes || {}).length,
        filters: feedbackData.filters,
      },
      prData: {
        loading: prData.loading,
        data: prData.data?.rawData?.length || 0,
        filters: prData.filters,
      },
      calculatedMetrics: {
        issueTotal: feedbackData.issueResponseTimes?.length || 0,
        issueResolved:
          feedbackData.issueResponseTimes?.filter((issue: any) => issue.state === 'closed')
            .length || 0,
        docTotal: feedbackData.data?.filter((item: any) => !item.rating).length || 0,
        docResolved:
          feedbackData.data?.filter((item: any) => !item.rating && item.isResolved === '1')
            .length || 0,
      },
    });
  }, [
    feedbackData.loading,
    feedbackData.issueAnalyticsLoading,
    feedbackData.data,
    feedbackData.issueResponseTimes,
    feedbackData.productResponseTimes,
    feedbackData.filters,
    prData.loading,
    prData.data,
    prData.filters,
  ]);

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

    // 如果选择了特定仓库，只显示这些仓库的数据
    if (feedbackData.filters.repos && feedbackData.filters.repos.length > 0) {
      return feedbackData.data.filter((item: any) => {
        // 根据API中的查询条件，使用 repo 字段进行筛选
        return feedbackData.filters.repos.includes(item.repo);
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
  const executiveMetrics = useMemo(() => {
    // Issue 解决率
    const issueResolveRate = metrics.issues.resolveRate;

    // 平均响应时长（小时）和响应率
    const allIssues = feedbackData.issueResponseTimes || [];
    // 只统计已响应的issue
    const respondedIssues = allIssues.filter((issue: any) => issue.hasResponse);
    // 计算所有issue（包括未响应）的平均等待/响应时间
    const allIssuesWithTime = allIssues.filter(
      (issue: any) => issue.responseTimeInHours !== null && issue.responseTimeInHours !== undefined
    );
    const avgResponseTimeInHours =
      allIssuesWithTime.length > 0
        ? Math.round(
            (allIssuesWithTime.reduce(
              (sum: number, issue: any) => sum + issue.responseTimeInHours,
              0
            ) /
              allIssuesWithTime.length) *
              10
          ) / 10
        : 0;
    const responseRate =
      allIssues.length > 0 ? Math.round((respondedIssues.length / allIssues.length) * 100) : 100;

    // 文档解决率
    const docResolveRate = metrics.discussions.answerRate;

    console.log('📈 计算管理层指标:', {
      issueResolveRate,
      avgResponseTimeInHours,
      responseRate,
      docResolveRate,
      来源数据: {
        totalIssues: metrics.issues.total,
        resolvedIssues: metrics.issues.resolved,
        totalDiscussions: metrics.discussions.total,
        answeredDiscussions: metrics.discussions.answered,
        issueResponseTimes长度: feedbackData.issueResponseTimes?.length || 0,
        feedbackData长度: feedbackData.data?.length || 0,
      },
    });

    return {
      issueResolveRate,
      avgResponseTimeInHours,
      responseRate,
      docResolveRate,
    };
  }, [
    metrics.issues.resolveRate,
    metrics.issues.response48hRate,
    metrics.discussions.answerRate,
    metrics.issues.total,
    metrics.issues.resolved,
    metrics.discussions.total,
    metrics.discussions.answered,
    feedbackData.issueResponseTimes,
    feedbackData.issueResponseTimes?.length,
    feedbackData.data?.length,
  ]);

  // 计算各仓库指标数据
  const repoIssueMetrics = calculateRepoIssueMetrics();
  const repoDocMetrics = calculateRepoDocMetrics();

  console.log('📊 仓库指标数据:', {
    repoIssueMetrics: repoIssueMetrics.length,
    repoDocMetrics: repoDocMetrics.length,
    executiveMetrics,
    数据状态: {
      feedbackData数据长度: feedbackData.data?.length || 0,
      issueResponseTimes长度: feedbackData.issueResponseTimes?.length || 0,
      当前筛选仓库: feedbackData.filters.repos,
      loading状态: {
        feedback: feedbackData.loading,
        issue: feedbackData.issueAnalyticsLoading,
        pr: prData.loading,
      },
    },
  });

  // 判断是否显示仓库表格（有数据就显示）
  const shouldShowRepoTable = true; // 总是显示表格，让数据决定是否有内容

  return (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <ExecutiveMetricCard
            showGap={false}
            showProgress={false}
            key={`issue48h-${feedbackData.issueResponseTimes?.length || 0}-${feedbackData.filters.repos.join(',')}`}
            title={`issue 平均响应时长`}
            value={executiveMetrics.avgResponseTimeInHours}
            target={48}
            unit="h"
            icon={<ClockCircleOutlined />}
            isGood={executiveMetrics.avgResponseTimeInHours <= 48}
            loading={feedbackData.issueAnalyticsLoading}
            showRepoTable={shouldShowRepoTable}
            repoTableData={repoIssueMetrics}
            repoTableType="issue48h"
            filters={feedbackData.filters}
            ruleDescription="计算规则：
1. 有label或非bot回复：使用实际响应时间
2. 无回复但已关闭：使用关闭时间作为响应时间
3. 仍开放且未响应：使用当前时间计算等待时间
统计所有issue的平均时长"
          />
        </Col>

        <Col xs={24} lg={8}>
          <ExecutiveMetricCard
            key={`issue-resolve-${feedbackData.issueResponseTimes?.length || 0}-${feedbackData.filters.repos.join(',')}`}
            title="Issue 解决率"
            value={executiveMetrics.issueResolveRate}
            target={80}
            icon={<CheckCircleOutlined />}
            isGood={executiveMetrics.issueResolveRate >= 80}
            loading={feedbackData.issueAnalyticsLoading}
            showRepoTable={shouldShowRepoTable}
            repoTableData={repoIssueMetrics}
            repoTableType="issue"
            filters={feedbackData.filters}
          />
        </Col>

        <Col xs={24} lg={8}>
          <ExecutiveMetricCard
            key={`doc-resolve-${feedbackData.data?.length || 0}-${feedbackData.filters.repos.join(',')}`}
            title="文档解决率"
            value={executiveMetrics.docResolveRate}
            target={100}
            icon={<FileTextOutlined />}
            isGood={executiveMetrics.docResolveRate >= 100}
            loading={feedbackData.loading}
            showRepoTable={shouldShowRepoTable}
            repoTableData={repoDocMetrics}
            repoTableType="doc"
            filters={feedbackData.filters}
          />
        </Col>
      </Row>

      <Divider />

      {/* 详情面板 - Tabs布局 */}
      <Tabs
        defaultActiveKey="prs"
        items={[
          {
            key: 'prs',
            label: (
              <div className="flex items-center px-2">
                <PullRequestOutlined className="text-slate-600 mr-2" />
                <span className="font-medium text-slate-700">Pull Requests</span>
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
              </div>
            ),
            children: (
              <div className="p-6">
                <IssueDetails />
              </div>
            ),
          },
          {
            key: 'monthly-issues',
            label: (
              <div className="flex items-center px-2">
                <ClockCircleOutlined className="text-slate-600 mr-2" />
                <span className="font-medium text-slate-700">按月统计</span>
              </div>
            ),
            children: (
              <div className="p-6">
                <MonthlyIssueStats
                  startDate={feedbackData.filters.startDate}
                  endDate={feedbackData.filters.endDate}
                />
              </div>
            ),
          },
          {
            key: 'docs',
            label: (
              <div className="flex items-center px-2">
                <CommentOutlined className="text-slate-600 mr-2" />
                <span className="font-medium text-slate-700">文档建议</span>
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
