'use client';

import { feedbackStore, fetchFeedbackData } from '@/app/store/feedbackStore';
import { Button, Empty, message, Spin, Table, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { useSnapshot } from 'valtio';

const { Link } = Typography;

interface DocDataDisplayProps {
  dataType: 'doc-suggestions' | 'page-ratings';
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
        fetchFeedbackData(); // 重新加载数据
      })
      .catch(error => {
        message.error(`操作失败: ${error.message}`);
      })
      .finally(() => {
        setProcessingIds(prev => prev.filter(id => id !== objectId));
      });
  };

  // 文档反馈明细表格列定义
  const docFeedbackColumns = [
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (text: string) => formatDate(text),
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '产品',
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
      ],
      onFilter: (value: string, record: any) => record.repo?.includes(value),
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
      onFilter: (value: string, record: any) => record.isResolved === value,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => {
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
  const pageRatingColumns = [
    {
      title: '产品',
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
      ],
      onFilter: (value: string, record: any) => record.repo?.includes(value),
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
      render: (text: string, record: any) => `👍 ${text} 👎 ${record.badReviews}`,
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
            .reduce((acc, item) => {
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
              if (!acc[url].comments.includes(item.reason)) {
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

  return (
    <div className="overflow-x-auto rounded-xl">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spin size="large" tip="数据加载中..." />
        </div>
      ) : getDataSource().length === 0 && !error ? (
        renderEmptyState()
      ) : (
        <Table
          dataSource={getDataSource()}
          rowKey="objectId"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total => `共 ${total} 条记录`,
          }}
          columns={getColumns() as any}
          className="custom-table w-full"
        />
      )}
    </div>
  );
}
