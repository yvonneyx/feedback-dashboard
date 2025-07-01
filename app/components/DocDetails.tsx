'use client';

import {
  CommentOutlined,
  FileTextOutlined,
  LoadingOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { Alert, Badge, Card, Col, Progress, Row, Spin, Tabs, Typography } from 'antd';
import { useSnapshot } from 'valtio';
import { feedbackStore } from '../store/feedbackStore';
import DocDataDisplay from './DocDataDisplay';

const { Title, Text } = Typography;

export default function DocDetails() {
  const { data, loading, error } = useSnapshot(feedbackStore);

  // 如果正在加载，显示loading状态
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center">
          <Spin size="large" indicator={<LoadingOutlined spin />} />
          <div className="mt-2 text-gray-600 text-sm">正在获取文档反馈数据...</div>
        </div>
      </div>
    );
  }

  // 如果有错误，显示错误状态
  if (error) {
    return (
      <Card className="border-slate-200 bg-slate-50 p-3">
        <Alert
          message="获取文档反馈数据失败"
          description={error}
          type="error"
          showIcon
          className="border-0 bg-transparent"
        />
      </Card>
    );
  }

  // 如果没有数据，显示空状态占位
  if (!data || data.length === 0) {
    return (
      <Card className="text-center py-8 bg-slate-50 border-slate-200">
        <CommentOutlined className="text-3xl text-slate-400 mb-2" />
        <div className="text-slate-500 mb-1">暂无文档反馈数据</div>
        <div className="text-slate-400 text-sm">请点击上方「查询数据」按钮获取数据</div>
      </Card>
    );
  }

  // 计算关键指标
  const metrics = {
    total: data?.length || 0,
    suggestions: data?.filter(item => !item.rating && item.isResolved === '0').length || 0,
    ratings: data?.filter(item => item.rating).length || 0,
    resolved: data?.filter(item => item.resolved || item.isResolved === '1').length || 0,
  };

  const resolveRate = metrics.total > 0 ? Math.round((metrics.resolved / metrics.total) * 100) : 0;
  const suggestionRate =
    metrics.total > 0 ? Math.round((metrics.suggestions / metrics.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* 紧凑指标展示 */}
      <div className="border border-slate-200 rounded-lg p-3 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center mb-3">
          <Title level={5} className="mb-1 text-slate-800">
            <CommentOutlined className="mr-1 text-slate-600" />
            文档反馈
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
              <div className="text-lg font-bold text-blue-600">{metrics.suggestions}</div>
              <div className="text-xs text-slate-500">文档建议</div>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center bg-white/80 rounded p-2 border border-slate-100">
              <div className="text-lg font-bold text-emerald-600">{metrics.ratings}</div>
              <div className="text-xs text-slate-500">页面评价</div>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center bg-white/80 rounded p-2 border border-slate-100">
              <div className="text-lg font-bold text-slate-700">{resolveRate}%</div>
              <div className="text-xs text-slate-500">处理率</div>
            </div>
          </Col>
        </Row>

        {/* 进度条 */}
        <Row gutter={8}>
          <Col span={12}>
            <div className="flex items-center justify-between mb-1">
              <Text className="text-xs text-slate-600">处理率</Text>
              <Text className="text-xs font-medium text-slate-700">{resolveRate}%</Text>
            </div>
            <Progress percent={resolveRate} strokeColor="#64748b" size="small" showInfo={false} />
          </Col>
          <Col span={12}>
            <div className="flex items-center justify-between mb-1">
              <Text className="text-xs text-slate-600">文档建议占比</Text>
              <Text className="text-xs font-medium text-slate-700">{suggestionRate}%</Text>
            </div>
            <Progress
              percent={suggestionRate}
              strokeColor="#3b82f6"
              size="small"
              showInfo={false}
            />
          </Col>
        </Row>
      </div>

      {/* 紧凑标签页 */}
      <Tabs
        defaultActiveKey="doc-suggestions"
        size="small"
        items={[
          {
            key: 'doc-suggestions',
            label: (
              <div className="flex items-center">
                <FileTextOutlined className="mr-1 text-slate-600" />
                <Badge count={metrics.suggestions} size="small" className="mr-1">
                  <span className="text-xs text-slate-600">文档建议</span>
                </Badge>
              </div>
            ),
            children: <DocDataDisplay dataType="doc-suggestions" />,
          },
          {
            key: 'page-ratings',
            label: (
              <span className="text-xs text-slate-600">
                <StarOutlined className="mr-1" />
                页面评价
              </span>
            ),
            children: <DocDataDisplay dataType="page-ratings" />,
          },
        ]}
      />
    </div>
  );
}
