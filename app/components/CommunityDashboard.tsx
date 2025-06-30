'use client';

import { feedbackStore } from '@/app/store/feedbackStore';
import { prStore } from '@/app/store/prStore';
import {
  BarChartOutlined,
  CommentOutlined,
  DownOutlined,
  IssuesCloseOutlined,
  PullRequestOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Card, Col, Collapse, Row, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useSnapshot } from 'valtio';
import DocDetails from './DocDetails';
import IssueDetails from './IssueDetails';
import PRStats from './PRStats';

const { Text } = Typography;
const { Panel } = Collapse;

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

export default function CommunityDashboard() {
  const prData = useSnapshot(prStore);
  const feedbackData = useSnapshot(feedbackStore);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  // 计算48小时响应率
  const calculate48hResponseRate = (issues: readonly any[]) => {
    if (!issues || issues.length === 0) return 0;

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
      : 0;

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
      : 0;

  metrics.discussions.answerRate =
    metrics.discussions.total > 0
      ? Math.round((metrics.discussions.answered / metrics.discussions.total) * 100)
      : 0;

  // 计算各仓库的详细指标
  const getRepoMetrics = () => {
    if (feedbackData.filters.repo && feedbackData.filters.repo !== '') {
      return null; // 如果选择了特定仓库，不显示仓库分解表格
    }

    const repos = [
      { key: 'antvis/g', name: 'G' },
      { key: 'antvis/g2', name: 'G2' },
      { key: 'antvis/s2', name: 'S2' },
      { key: 'antvis/f2', name: 'F2' },
      { key: 'antvis/g6', name: 'G6' },
      { key: 'antvis/x6', name: 'X6' },
      { key: 'antvis/l7', name: 'L7' },
      { key: 'antvis/AVA', name: 'AVA' },
      { key: 'ant-design/ant-design-charts', name: 'Charts' },
    ];

    return repos.map(repo => {
      // PR 数据
      const repoPRs = prData.data?.details?.filtered
        ? Object.values(prData.data.details.filtered)
            .flat()
            .filter((pr: any) => pr.repo === repo.key)
        : [];
      const prTotal = repoPRs.length;
      const prMerged = repoPRs.filter((pr: any) => pr.state === 'closed' && pr.merged_at).length;
      const prMergeRate = prTotal > 0 ? Math.round((prMerged / prTotal) * 100) : 0;

      // Issue 数据
      const repoIssues = feedbackData.productResponseTimes?.[repo.key] || [];
      const issueTotal = repoIssues.length;
      const issueResolved = repoIssues.filter((issue: any) => issue.state === 'closed').length;
      const issueResolveRate = issueTotal > 0 ? Math.round((issueResolved / issueTotal) * 100) : 0;
      const issue48hRate = issueTotal > 0 ? calculate48hResponseRate([...repoIssues]) : 0;

      // 文档建议数据
      const repoFeedback = feedbackData.data?.filter((item: any) => item.repo === repo.key) || [];
      const docAllSuggestions = repoFeedback.filter((item: any) => !item.rating);
      const docResolved = repoFeedback.filter(
        (item: any) => !item.rating && item.isResolved === '1'
      );
      const docProcessRate =
        docAllSuggestions.length > 0
          ? Math.round((docResolved.length / docAllSuggestions.length) * 100)
          : 0;

      return {
        key: repo.key,
        name: repo.name,
        prTotal,
        prMerged,
        prMergeRate,
        issueTotal,
        issueResolved,
        issueResolveRate,
        issue48hRate,
        docTotal: docAllSuggestions.length,
        docResolved: docResolved.length,
        docProcessRate,
      };
    });
  };

  const repoMetrics = getRepoMetrics();

  // PR 仓库详情表格组件
  const PRRepoTable = () => {
    if (!repoMetrics) return null;

    const columns = [
      { title: '仓库', dataIndex: 'name', key: 'name', width: 60 },
      { title: '总数', dataIndex: 'prTotal', key: 'prTotal', width: 50, align: 'center' as const },
      {
        title: '已合并',
        dataIndex: 'prMerged',
        key: 'prMerged',
        width: 60,
        align: 'center' as const,
      },
      {
        title: '合并率',
        dataIndex: 'prMergeRate',
        key: 'prMergeRate',
        width: 60,
        align: 'center' as const,
        render: (rate: number) => `${rate}%`,
      },
    ];

    return (
      <div className="mt-3 pt-3 border-t border-slate-200">
        <Text className="text-xs text-slate-600 mb-2 block">各仓库详情</Text>
        <Table
          columns={columns}
          dataSource={repoMetrics}
          size="small"
          pagination={false}
          className="text-xs"
        />
      </div>
    );
  };

  // Issue 仓库详情表格组件
  const IssueRepoTable = () => {
    if (!repoMetrics) return null;

    const columns = [
      { title: '仓库', dataIndex: 'name', key: 'name', width: 50 },
      {
        title: '总数',
        dataIndex: 'issueTotal',
        key: 'issueTotal',
        width: 45,
        align: 'center' as const,
      },
      {
        title: '已解决',
        dataIndex: 'issueResolved',
        key: 'issueResolved',
        width: 55,
        align: 'center' as const,
      },
      {
        title: '解决率',
        dataIndex: 'issueResolveRate',
        key: 'issueResolveRate',
        width: 55,
        align: 'center' as const,
        render: (rate: number) => `${rate}%`,
      },
      {
        title: '48h响应',
        dataIndex: 'issue48hRate',
        key: 'issue48hRate',
        width: 65,
        align: 'center' as const,
        render: (rate: number) => `${rate}%`,
      },
    ];

    return (
      <div className="mt-3 pt-3 border-t border-slate-200">
        <Text className="text-xs text-slate-600 mb-2 block">各仓库详情</Text>
        <Table
          columns={columns}
          dataSource={repoMetrics}
          size="small"
          pagination={false}
          className="text-xs"
        />
      </div>
    );
  };

  // 文档建议仓库详情表格组件
  const DocRepoTable = () => {
    if (!repoMetrics) return null;

    const columns = [
      { title: '仓库', dataIndex: 'name', key: 'name', width: 60 },
      {
        title: '建议数',
        dataIndex: 'docTotal',
        key: 'docTotal',
        width: 60,
        align: 'center' as const,
      },
      {
        title: '已处理',
        dataIndex: 'docResolved',
        key: 'docResolved',
        width: 60,
        align: 'center' as const,
      },
      {
        title: '处理率',
        dataIndex: 'docProcessRate',
        key: 'docProcessRate',
        width: 60,
        align: 'center' as const,
        render: (rate: number) => `${rate}%`,
      },
    ];

    return (
      <div className="mt-3 pt-3 border-t border-slate-200">
        <Text className="text-xs text-slate-600 mb-2 block">各仓库详情</Text>
        <Table
          columns={columns}
          dataSource={repoMetrics}
          size="small"
          pagination={false}
          className="text-xs"
        />
      </div>
    );
  };

  const handleCollapseChange = (keys: string | string[]) => {
    setActiveKeys(Array.isArray(keys) ? keys : [keys]);
  };

  return (
    <div className="space-y-4">
      {/* 超紧凑概览 */}
      <Row gutter={12}>
        {/* PR */}
        <Col xs={24} lg={8}>
          <div className="border border-slate-200 rounded-lg p-3 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <PullRequestOutlined className="text-slate-600 mr-1" />
                <Text strong className="text-sm text-slate-700">
                  Pull Requests
                </Text>
              </div>
              <Tag color="default" className="text-xs border-slate-300 text-slate-600">
                {metrics.prs.total}
              </Tag>
            </div>

            <Row gutter={8} className="mb-2">
              <Col span={8}>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-800">{metrics.prs.total}</div>
                  <div className="text-xs text-slate-500">总数</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-600">{metrics.prs.merged}</div>
                  <div className="text-xs text-slate-500">已合并</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-700">{metrics.prs.mergeRate}%</div>
                  <div className="text-xs text-slate-500">合并率</div>
                </div>
              </Col>
            </Row>

            <PRRepoTable />
          </div>
        </Col>

        {/* Issues */}
        <Col xs={24} lg={8}>
          <div className="border border-slate-200 rounded-lg p-3 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <IssuesCloseOutlined className="text-slate-600 mr-1" />
                <Text strong className="text-sm text-slate-700">
                  Issues
                </Text>
              </div>
              <Tag color="default" className="text-xs border-slate-300 text-slate-600">
                {metrics.issues.total}
              </Tag>
            </div>

            <Row gutter={8} className="mb-2">
              <Col span={6}>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-800">{metrics.issues.total}</div>
                  <div className="text-xs text-slate-500">总数</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-600">
                    {metrics.issues.resolved}
                  </div>
                  <div className="text-xs text-slate-500">已解决</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-700">
                    {metrics.issues.resolveRate}%
                  </div>
                  <div className="text-xs text-slate-500">解决率</div>
                </div>
              </Col>
              <Col span={6}>
                <div className="text-center">
                  <div className="text-lg font-bold text-amber-600">
                    {metrics.issues.response48hRate}%
                  </div>
                  <div className="text-xs text-slate-500">48h响应</div>
                </div>
              </Col>
            </Row>

            <IssueRepoTable />
          </div>
        </Col>

        {/* 文档建议 */}
        <Col xs={24} lg={8}>
          <div className="border border-slate-200 rounded-lg p-3 bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <CommentOutlined className="text-slate-600 mr-1" />
                <Text strong className="text-sm text-slate-700">
                  文档建议
                </Text>
              </div>
              <Tag color="default" className="text-xs border-slate-300 text-slate-600">
                {metrics.discussions.total}
              </Tag>
            </div>

            <Row gutter={8} className="mb-2">
              <Col span={8}>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-800">
                    {metrics.discussions.total}
                  </div>
                  <div className="text-xs text-slate-500">建议数</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center">
                  <div className="text-lg font-bold text-emerald-600">
                    {metrics.discussions.answered}
                  </div>
                  <div className="text-xs text-slate-500">已处理</div>
                </div>
              </Col>
              <Col span={8}>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-700">
                    {metrics.discussions.answerRate}%
                  </div>
                  <div className="text-xs text-slate-500">处理率</div>
                </div>
              </Col>
            </Row>

            <DocRepoTable />
          </div>
        </Col>
      </Row>

      {/* 紧凑详情折叠面板 */}
      <Collapse
        activeKey={activeKeys}
        onChange={handleCollapseChange}
        expandIcon={({ isActive }) => (isActive ? <DownOutlined /> : <RightOutlined />)}
        className="shadow-sm border border-slate-200"
        size="small"
      >
        <Panel
          header={
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center">
                <PullRequestOutlined className="text-slate-600 mr-2" />
                <span className="font-medium text-slate-700">PR 详细分析</span>
              </div>
              <div className="flex items-center space-x-2">
                <Text type="secondary" className="text-xs">
                  {metrics.prs.total}个 · 合并率{metrics.prs.mergeRate}%
                </Text>
                <Tag color="default" className="border-slate-300 text-slate-600">
                  {metrics.prs.total}
                </Tag>
              </div>
            </div>
          }
          key="prs"
          className="mb-2"
        >
          <PRStats />
        </Panel>

        <Panel
          header={
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center">
                <IssuesCloseOutlined className="text-slate-600 mr-2" />
                <span className="font-medium text-slate-700">Issue 处理分析</span>
              </div>
              <div className="flex items-center space-x-2">
                <Text type="secondary" className="text-xs">
                  {metrics.issues.total}个 · 48h响应{metrics.issues.response48hRate}%
                </Text>
                <Tag color="default" className="border-slate-300 text-slate-600">
                  {metrics.issues.total}
                </Tag>
              </div>
            </div>
          }
          key="issues"
          className="mb-2"
        >
          <IssueDetails />
        </Panel>

        <Panel
          header={
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center">
                <CommentOutlined className="text-slate-600 mr-2" />
                <span className="font-medium text-slate-700">文档建议分析</span>
              </div>
              <div className="flex items-center space-x-2">
                <Text type="secondary" className="text-xs">
                  {metrics.discussions.total}个 · 处理率{metrics.discussions.answerRate}%
                </Text>
                <Tag color="default" className="border-slate-300 text-slate-600">
                  {metrics.discussions.total}
                </Tag>
              </div>
            </div>
          }
          key="discussions"
          className="mb-2"
        >
          <DocDetails />
        </Panel>
      </Collapse>

      {/* 空状态 */}
      {!prData.data && !feedbackData.data && !feedbackData.issueResponseTimes && (
        <Card className="text-center py-8 border-slate-200">
          <BarChartOutlined className="text-3xl text-slate-400 mb-2" />
          <div className="text-slate-500 mb-1">暂无数据</div>
          <div className="text-slate-400 text-sm">请点击「查询数据」按钮获取数据</div>
        </Card>
      )}
    </div>
  );
}
