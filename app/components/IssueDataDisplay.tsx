'use client';

import { feedbackStore } from '@/app/store/feedbackStore';
import { CheckCircleOutlined, GithubOutlined } from '@ant-design/icons';
import { Button, Empty, Space, Spin, Table, TableColumnsType, Tag, Typography } from 'antd';
import { useSnapshot } from 'valtio';

const { Text } = Typography;

interface IssueDataDisplayProps {
  dataType: 'unresponded-issues' | 'issue-response-times';
}

export default function IssueDataDisplay({ dataType }: IssueDataDisplayProps) {
  const { error, issueResponseTimes, issueAnalyticsLoading, filters } = useSnapshot(feedbackStore);

  // 判断是否显示产品列
  const showRepoColumn = !filters.repo;

  // 格式化数据的辅助函数
  const formatDate = (dateString: string) => dateString?.split('T')[0] || '';

  // 从URL中提取仓库名称
  const getRepoFromUrl = (url: string) => {
    if (!url) return '';
    try {
      // @ts-nocheck
      const matches = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
      return matches ? matches[1].split('/')[1] : '';
    } catch {
      return '';
    }
  };

  // 筛选数据，根据不同的数据类型
  const getFilteredData = () => {
    if (!issueResponseTimes) return [];

    switch (dataType) {
      case 'unresponded-issues':
        return issueResponseTimes.filter(item => !item.hasResponse);
      default:
        return issueResponseTimes;
    }
  };

  // Issue 表格列定义
  const getBaseColumns = (): TableColumnsType<any> => {
    const columns: TableColumnsType<any> = [
      {
        title: 'Issue #',
        dataIndex: 'number',
        key: 'number',
        render: (text: string, record: any) => (
          <a href={record.html_url} target="_blank" rel="noopener noreferrer">
            #{text}
          </a>
        ),
        width: 100,
      },
    ];

    // 如果显示所有产品，添加产品列
    if (showRepoColumn) {
      columns.push({
        title: '产品',
        key: 'repo',
        width: 100,
        render: (_: any, record: any) => {
          const repo = getRepoFromUrl(record.html_url);
          return (
            <Tag color="blue" className="rounded-full px-2">
              {repo}
            </Tag>
          );
        },
        filters: [
          { text: 'G', value: 'g' },
          { text: 'G2', value: 'g2' },
          { text: 'S2', value: 's2' },
          { text: 'F2', value: 'f2' },
          { text: 'G6', value: 'g6' },
          { text: 'X6', value: 'x6' },
          { text: 'L7', value: 'l7' },
          { text: 'AVA', value: 'ava' },
          { text: 'Charts', value: 'charts' },
        ],
        onFilter: (value: any, record: any) =>
          getRepoFromUrl(record.html_url).toLowerCase() === value,
      });
    }

    // 添加标题和其他通用列
    columns.push(
      {
        title: '标题',
        dataIndex: 'title',
        key: 'title',
        render: (text: string, record: any) => (
          <a href={record.html_url} target="_blank" rel="noopener noreferrer">
            {text}
          </a>
        ),
        ellipsis: true,
      },
      {
        title: '创建时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: '15%',
        render: (time: string) => formatDate(time),
        sorter: (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      }
    );

    return columns;
  };

  // 获取未响应Issues的列定义
  const getUnrespondedIssuesColumns = (): TableColumnsType<any> => {
    return [...getBaseColumns()];
  };

  // 获取Issue响应时间的列定义
  const getIssueResponseTimesColumns = (): TableColumnsType<any> => {
    return [
      ...(getBaseColumns() as any),
      {
        title: '状态',
        dataIndex: 'state',
        key: 'state',
        render: (state: string) => (
          <Tag color={state === 'open' ? 'green' : 'gray'}>
            {state === 'open' ? '开启' : '关闭'}
          </Tag>
        ),
        width: 80,
        filters: [
          { text: '开启', value: 'open' },
          { text: '关闭', value: 'closed' },
        ],
        onFilter: (value: string, record: any) => record.state === value,
      },
      {
        title: '是否响应',
        dataIndex: 'hasResponse',
        key: 'hasResponse',
        render: (hasResponse: boolean) => (
          <Tag color={hasResponse ? 'success' : 'warning'}>{hasResponse ? '已响应' : '未响应'}</Tag>
        ),
        width: 120,
        filters: [
          { text: '已响应', value: true },
          { text: '未响应', value: false },
        ],
        onFilter: (value: boolean, record: any) => record.hasResponse === value,
      },
      {
        title: '响应时间(小时)',
        dataIndex: 'responseTimeInHours',
        key: 'responseTimeInHours',
        render: (hours: number | null, record: any) => {
          if (hours === null) return <Text type="secondary">-</Text>;

          const colorClass =
            hours <= 24 ? 'text-green-600' : hours <= 48 ? 'text-blue-600' : 'text-amber-600';

          return (
            <Text className={colorClass} strong>
              {hours}
              {record.meetsSLA && <CheckCircleOutlined className="ml-2 text-green-500" />}
            </Text>
          );
        },
        sorter: (a: any, b: any) => {
          if (a.responseTimeInHours === null && b.responseTimeInHours === null) return 0;
          if (a.responseTimeInHours === null) return 1;
          if (b.responseTimeInHours === null) return -1;
          return a.responseTimeInHours - b.responseTimeInHours;
        },
        width: 150,
      },
    ];
  };

  // 获取正确的列定义
  const getColumns = () => {
    switch (dataType) {
      case 'unresponded-issues':
        return getUnrespondedIssuesColumns();
      case 'issue-response-times':
        return getIssueResponseTimesColumns();
      default:
        return [];
    }
  };

  // 获取正确的数据源
  const getDataSource = () => {
    switch (dataType) {
      case 'unresponded-issues':
        return getFilteredData();
      case 'issue-response-times':
        return issueResponseTimes || [];
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
          {dataType === 'unresponded-issues' && (
            <Button
              type="primary"
              icon={<GithubOutlined />}
              href="https://github.com/antvis"
              target="_blank"
            >
              前往 GitHub 查看
            </Button>
          )}
        </div>
      }
    />
  );

  return (
    <div className="overflow-x-auto rounded-xl">
      {issueAnalyticsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spin size="large" tip="数据加载中..." />
        </div>
      ) : getDataSource().length === 0 && !error ? (
        renderEmptyState()
      ) : (
        <div>
          {!filters.repo && (
            <div className="mb-3">
              <Space size="small">
                <Text type="secondary" className="text-sm">
                  显示全部产品数据
                </Text>
                <Tag color="processing" className="rounded-full">
                  {getDataSource().length} 条记录
                </Tag>
              </Space>
            </div>
          )}
          <Table
            dataSource={getDataSource()}
            rowKey={dataType === 'issue-response-times' ? 'number' : 'id'}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: total => `共 ${total} 条记录`,
              className: 'custom-pagination',
            }}
            columns={getColumns()}
            className="custom-table hover-row-highlight"
            rowClassName={(_, index) => (index % 2 === 0 ? 'bg-gray-50/50' : '')}
            onRow={_ => ({
              className: 'transition-all duration-200 hover:bg-blue-50/50',
            })}
          />
        </div>
      )}
    </div>
  );
}
