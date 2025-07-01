'use client';

import { feedbackStore } from '@/app/store/feedbackStore';
import {
  ClockCircleOutlined,
  IssuesCloseOutlined,
  LineChartOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Alert, Badge, Button, Card, Col, Progress, Row, Spin, Tabs, Typography } from 'antd';
import { useSnapshot } from 'valtio';
import IssueDataDisplay from './IssueDataDisplay';

const { Title, Text } = Typography;

export default function IssueDetails() {
  const { issueResponseTimes, filters, issueAnalyticsLoading, error } = useSnapshot(feedbackStore);

  // 如果正在加载，显示loading状态
  if (issueAnalyticsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center">
          <Spin size="large" indicator={<LoadingOutlined spin />} />
          <div className="mt-2 text-gray-600 text-sm">正在获取Issue数据...</div>
        </div>
      </div>
    );
  }

  // 如果有错误，显示错误状态
  if (error) {
    return (
      <Card className="border-slate-200 bg-slate-50 p-3">
        <Alert
          message="获取Issue数据失败"
          description={error}
          type="error"
          showIcon
          className="border-0 bg-transparent"
        />
      </Card>
    );
  }

  // 如果没有数据，显示空状态占位
  if (!issueResponseTimes || issueResponseTimes.length === 0) {
    return (
      <Card className="text-center py-8 bg-slate-50 border-slate-200">
        <IssuesCloseOutlined className="text-3xl text-slate-400 mb-2" />
        <div className="text-slate-500 mb-1">暂无 Issue 数据</div>
        <div className="text-slate-400 text-sm">请点击上方「查询数据」按钮获取数据</div>
      </Card>
    );
  }

  // 计算关键指标
  const metrics = {
    total: issueResponseTimes?.length || 0,
    resolved: issueResponseTimes?.filter(issue => issue.state === 'closed').length || 0,
    unresponded: issueResponseTimes?.filter(issue => !issue.hasResponse).length || 0,
    response48h:
      issueResponseTimes?.filter(issue => {
        // 使用正确的字段名：hasResponse 和 responseTimeInHours
        return (
          issue.hasResponse && issue.responseTimeInHours !== null && issue.responseTimeInHours <= 48
        );
      }).length || 0,
  };

  const resolveRate = metrics.total > 0 ? Math.round((metrics.resolved / metrics.total) * 100) : 0;
  const response48hRate =
    metrics.total > 0 ? Math.round((metrics.response48h / metrics.total) * 100) : 0;

  // 生成标签文字
  const getTabTitle = () => {
    return filters.repo ? `待响应 Issue` : `待响应 Issue (全部)`;
  };

  return (
    <div className="space-y-4">
      {/* 紧凑指标展示 */}
      <div className="border border-slate-200 rounded-lg p-3 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center mb-3">
          <Title level={5} className="mb-1 text-slate-800">
            <IssuesCloseOutlined className="mr-1 text-slate-600" />
            Issue 处理
          </Title>
        </div>

        <Row gutter={8} className="mb-3">
          <Col span={6}>
            <div className="text-center bg-white/80 rounded p-2 border border-slate-100">
              <div className="text-lg font-bold text-slate-800">{metrics.total}</div>
              <div className="text-xs text-slate-500">总数</div>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center bg-white/80 rounded p-2 border border-slate-100">
              <div className="text-lg font-bold text-emerald-600">{metrics.resolved}</div>
              <div className="text-xs text-slate-500">已解决</div>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center bg-white/80 rounded p-2 border border-slate-100">
              <div className="text-lg font-bold text-rose-600">{metrics.unresponded}</div>
              <div className="text-xs text-slate-500">待响应</div>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center bg-white/80 rounded p-2 border border-slate-100">
              <div className="text-lg font-bold text-amber-600">{response48hRate}%</div>
              <div className="text-xs text-slate-500">48h响应率</div>
            </div>
          </Col>
        </Row>

        {/* 进度条 */}
        <Row gutter={8}>
          <Col span={12}>
            <div className="flex items-center justify-between mb-1">
              <Text className="text-xs text-slate-600">解决率</Text>
              <Text className="text-xs font-medium text-slate-700">{resolveRate}%</Text>
            </div>
            <Progress percent={resolveRate} strokeColor="#10b981" size="small" showInfo={false} />
          </Col>
          <Col span={12}>
            <div className="flex items-center justify-between mb-1">
              <Text className="text-xs text-slate-600">48h响应率</Text>
              <Text className="text-xs font-medium text-slate-700">{response48hRate}%</Text>
            </div>
            <Progress
              percent={response48hRate}
              strokeColor="#f59e0b"
              size="small"
              showInfo={false}
            />
          </Col>
        </Row>
      </div>

      {/* 紧凑标签页 */}
      <Tabs
        defaultActiveKey="issue-metrics"
        size="small"
        items={[
          {
            key: 'unresponded-issues',
            label: (
              <div className="flex items-center">
                <ClockCircleOutlined className="mr-1 text-slate-600" />
                <Badge count={metrics.unresponded} size="small" className="mr-1">
                  <span className="text-xs text-slate-600">{getTabTitle()}</span>
                </Badge>
              </div>
            ),
            children: <IssueDataDisplay dataType="unresponded-issues" />,
          },
          {
            key: 'issue-response-times',
            label: (
              <span className="text-xs text-slate-600">
                <ThunderboltOutlined className="mr-1" />
                响应时间
              </span>
            ),
            children: <IssueDataDisplay dataType="issue-response-times" />,
          },
        ]}
        tabBarExtraContent={
          <Button
            type="link"
            icon={<LineChartOutlined />}
            href="https://ossinsight.io/"
            target="_blank"
            className="text-xs text-slate-600 hover:text-slate-800"
          >
            OSS Insight
          </Button>
        }
      />
    </div>
  );
}
