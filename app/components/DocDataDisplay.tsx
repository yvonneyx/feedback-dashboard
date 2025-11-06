'use client';

import { feedbackStore, updateFeedbackResolveStatus } from '@/app/store/feedbackStore';
import { DislikeOutlined, LikeOutlined } from '@ant-design/icons';
import { Button, Empty, message, Spin, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { useSnapshot } from 'valtio';

const { Link, Text } = Typography;

interface DocDataDisplayProps {
  dataType: 'doc-suggestions' | 'page-ratings';
}

interface DocFeedbackItem {
  objectId: string;
  createdAt: string;
  repo: string;
  url: string;
  title: string;
  comment: string;
  isResolved: string;
}

interface PageRatingItem {
  url: string;
  repo: string;
  comments: string[];
  goodReviews: number;
  badReviews: number;
}

export default function DocDataDisplay({ dataType }: DocDataDisplayProps) {
  const { data, loading, error } = useSnapshot(feedbackStore);
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  // 格式化数据的辅助函数
  const formatDate = (dateString: string) => dateString?.split('T')[0] || '';

  const formatRepo = (repo: string) => {
    if (!repo) return '';
    return repo.split('/')[1] === 'ant-design-charts' ? 'Charts' : repo.split('/')[1].toUpperCase();
  };

  const formatUrl = (url: string) => decodeURI(url);

  // 标记为已解决或未解决
  const handleMarkAsResolved = (objectId: string, setToResolved: boolean) => {
    setProcessingIds(prev => [...prev, objectId]);

    fetch('/api/resolve-feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        objectId,
        resolved: setToResolved,
      }),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('更新失败');
        }
        return response.json();
      })
      .then(data => {
        message.success(data.message || `已${setToResolved ? '解决' : '取消解决'}该反馈`);
        // 使用懒更新：直接在本地更新状态，无需重新请求列表
        updateFeedbackResolveStatus(objectId, setToResolved);
      })
      .catch(error => {
        message.error(`操作失败: ${error.message}`);
      })
      .finally(() => {
        setProcessingIds(prev => prev.filter(id => id !== objectId));
      });
  };

  // 计算页面评价统计数据
  const calculateRatingStats = () => {
    if (!data) return { totalGood: 0, totalBad: 0 };

    const ratingData = data.filter(item => item.rating);
    const totalGood = ratingData.filter(item => item.rating === '1').length;
    const totalBad = ratingData.filter(item => item.rating === '0').length;

    return { totalGood, totalBad };
  };

  // 文档反馈明细表格列定义
  const docFeedbackColumns: ColumnsType<DocFeedbackItem> = [
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (text: string) => formatDate(text),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '仓库',
      dataIndex: 'repo',
      key: 'repo',
      render: (text: string) => (
        <Tag color="blue" className="rounded-full px-2 font-medium">
          {formatRepo(text)}
        </Tag>
      ),
      filters: [
        { text: 'G', value: 'antvis/g' },
        { text: 'G2', value: 'antvis/g2' },
        { text: 'S2', value: 'antvis/s2' },
        { text: 'F2', value: 'antvis/f2' },
        { text: 'G6', value: 'antvis/g6' },
        { text: 'X6', value: 'antvis/x6' },
        { text: 'L7', value: 'antvis/l7' },
        { text: 'AVA', value: 'antvis/ava' },
        { text: 'ADC', value: 'ant-design/ant-design-charts' },
        { text: 'T8', value: 'antvis/T8' },
      ],
      onFilter: (value, record) => record.repo?.includes(value as string),
    },
    {
      title: '访问地址',
      dataIndex: 'url',
      key: 'url',
      width: 150,
      render: (text: string) => (
        <Link href={text} target="_blank" ellipsis>
          {formatUrl(text).split('/').slice(3).join('/')}
        </Link>
      ),
    },
    {
      title: '段落标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
    },
    {
      title: '建议',
      dataIndex: 'comment',
      key: 'comment',
      width: 250,
    },
    {
      title: '当前状态',
      dataIndex: 'isResolved',
      key: 'isResolved',
      width: 130,
      render: (value: string) =>
        value === '1' ? (
          <Tag color="success" className="rounded-full px-2 font-medium">
            已解决
          </Tag>
        ) : (
          <Tag color="warning" className="rounded-full px-2 font-medium">
            未解决
          </Tag>
        ),
      filters: [
        { text: '已解决', value: '1' },
        { text: '未解决', value: '0' },
      ],
      onFilter: (value, record) => record.isResolved === (value as string),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const isProcessing = processingIds.includes(record.objectId);

        return record.isResolved === '1' ? (
          <Button
            type="link"
            danger
            loading={isProcessing}
            onClick={() => handleMarkAsResolved(record.objectId, false)}
          >
            标记为未解决
          </Button>
        ) : (
          <Button
            type="link"
            loading={isProcessing}
            onClick={() => handleMarkAsResolved(record.objectId, true)}
          >
            标记为已解决
          </Button>
        );
      },
    },
  ];

  // 页面评价表格列
  const pageRatingColumns: ColumnsType<PageRatingItem> = [
    {
      title: '仓库',
      dataIndex: 'repo',
      key: 'repo',
      width: 80,
      render: (text: string) => (
        <Tag color="blue" className="rounded-full px-2 font-medium">
          {formatRepo(text)}
        </Tag>
      ),
      filters: [
        { text: 'G', value: 'antvis/g' },
        { text: 'G2', value: 'antvis/g2' },
        { text: 'S2', value: 'antvis/s2' },
        { text: 'F2', value: 'antvis/f2' },
        { text: 'G6', value: 'antvis/g6' },
        { text: 'X6', value: 'antvis/x6' },
        { text: 'L7', value: 'antvis/l7' },
        { text: 'AVA', value: 'antvis/ava' },
        { text: 'ADC', value: 'ant-design/ant-design-charts' },
        { text: 'T8', value: 'antvis/T8' },
      ],
      onFilter: (value, record) => record.repo?.includes(value as string),
    },
    {
      title: '页面路径',
      dataIndex: 'url',
      key: 'url',
      width: 300,
      render: (text: string) => (
        <Tooltip title={text}>
          <Link href={text} target="_blank" ellipsis>
            {formatUrl(text)}
          </Link>
        </Tooltip>
      ),
    },
    {
      title: '评价',
      dataIndex: 'goodReviews',
      key: 'goodReviews',
      render: (text: number, record) => `👍 ${text} 👎 ${record.badReviews}`,
    },
    {
      title: '评论',
      dataIndex: 'comments',
      key: 'comments',
      render: (text: string[]) => text.join(', '),
    },
  ];

  // 获取正确的列定义
  const getColumns = () => {
    switch (dataType) {
      case 'doc-suggestions':
        return docFeedbackColumns;
      case 'page-ratings':
        return pageRatingColumns;
      default:
        return [];
    }
  };

  // 获取正确的数据源
  const getDataSource = () => {
    if (!data) return [];
    console.log(data);
    switch (dataType) {
      case 'doc-suggestions':
        return data.filter(item => !item.rating);
      case 'page-ratings':
        return Object.values(
          data
            .filter(item => item.rating)
            .reduce((acc: Record<string, PageRatingItem>, item) => {
              const url = decodeURI(item.url).split('/').slice(3).join('/');
              if (!acc[url]) {
                acc[url] = {
                  url: url,
                  repo: item.repo,
                  comments: [],
                  goodReviews: 0,
                  badReviews: 0,
                };
              }
              if (item.rating === '1') {
                acc[url].goodReviews += 1;
              } else {
                acc[url].badReviews += 1;
              }
              if (item.reason && !acc[url].comments.includes(item.reason)) {
                acc[url].comments.push(item.reason);
              }
              return acc;
            }, {})
        );
      default:
        return [];
    }
  };

  const renderEmptyState = () => (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div className="text-center">
          <p className="mb-4">暂无数据</p>
        </div>
      }
    />
  );

  // 渲染页面评价统计信息
  const renderRatingStats = () => {
    if (dataType !== 'page-ratings') return null;

    const { totalGood, totalBad } = calculateRatingStats();
    const totalRatings = totalGood + totalBad;
    const goodPercentage = totalRatings > 0 ? Math.round((totalGood / totalRatings) * 100) : 0;

    return (
      <div className="mb-4">
        <div className="bg-slate-50 rounded-lg p-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 mr-2">
                  <LikeOutlined className="text-slate-600 text-sm" />
                </div>
                <div>
                  <Text className="text-slate-400 text-xs">有用</Text>
                  <div className="font-medium text-slate-700">{totalGood}</div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 mr-2">
                  <DislikeOutlined className="text-slate-600 text-sm" />
                </div>
                <div>
                  <Text className="text-slate-400 text-xs">待改进</Text>
                  <div className="font-medium text-slate-700">{totalBad}</div>
                </div>
              </div>

              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 mr-2">
                  <span className="text-slate-700 text-sm">{goodPercentage}%</span>
                </div>
                <div>
                  <Text className="text-slate-400 text-xs">满意度</Text>
                </div>
              </div>
            </div>

            <div className="text-right">
              <Text className="text-xs text-slate-400">总计 {totalRatings} 个评价</Text>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spin size="large" tip="数据加载中..." />
        </div>
      ) : getDataSource().length === 0 && !error ? (
        renderEmptyState()
      ) : (
        <>
          {renderRatingStats()}
          <Table
            dataSource={getDataSource()}
            columns={getColumns()}
            rowKey={record => record.objectId || record.url}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: total => `共 ${total} 条记录`,
            }}
            className="rounded-lg border border-gray-100 overflow-hidden"
          />
        </>
      )}
    </div>
  );
}
