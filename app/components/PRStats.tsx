'use client';

import { ALL_PRODUCTS, feedbackStore } from '@/app/store/feedbackStore';
import { getPRTypeColor, getPRTypeLabel, prStore } from '@/app/store/prStore';
import { BarChartOutlined, LoadingOutlined, PullRequestOutlined } from '@ant-design/icons';
import { Alert, Avatar, Card, Col, Progress, Row, Spin, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';

const { Text, Title } = Typography;

// 简单的饼图组件 - 重新设计
interface ChartDataItem {
  type: string;
  value: number;
  color: string;
}

function SimpleChart({ data, title }: { data: ChartDataItem[]; title?: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <div className="text-center text-gray-400 py-4">
        <BarChartOutlined className="text-xl mb-1" />
        <div className="text-xs">暂无数据</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data
        .filter(item => item.value > 0)
        .sort((a, b) => b.value - a.value)
        .map(item => {
          const percentage = Math.round((item.value / total) * 100);
          return (
            <div key={item.type} className="bg-white rounded p-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  />
                  <Text className="text-xs font-medium">{item.type}</Text>
                </div>
                <div className="flex items-center space-x-1">
                  <Text className="text-sm font-bold">{item.value}</Text>
                  <Text type="secondary" className="text-xs">
                    ({percentage}%)
                  </Text>
                </div>
              </div>
              <Progress
                percent={percentage}
                strokeColor={item.color}
                size="small"
                showInfo={false}
                strokeWidth={4}
              />
            </div>
          );
        })}
    </div>
  );
}

export default function PRStats() {
  const { loading, data, error } = useSnapshot(prStore);
  const feedbackFilters = useSnapshot(feedbackStore.filters);

  // 当全局筛选条件变化时，同步更新 PR 筛选条件（但不自动发起请求）
  useEffect(() => {
    // 根据全局筛选条件更新 PR 筛选条件
    const repos =
      !feedbackFilters.repo || feedbackFilters.repo === '' || feedbackFilters.repo === 'all'
        ? ALL_PRODUCTS.map(product => product.value)
        : [feedbackFilters.repo];

    prStore.filters.startDate = dayjs(feedbackFilters.startDate).format('YYYY-MM-DD');
    prStore.filters.endDate = dayjs(feedbackFilters.endDate).format('YYYY-MM-DD');
    prStore.filters.repos = repos;

    console.log('🔍 PR筛选条件更新:', {
      全局仓库选择: feedbackFilters.repo,
      处理后的仓库列表: repos,
      仓库数量: repos.length,
    });

    // 移除自动触发的 PR 数据获取，等待用户手动触发
    // fetchPRData();
  }, [feedbackFilters.startDate, feedbackFilters.endDate, feedbackFilters.repo]);

  // 准备图表数据
  const chartData = useMemo(() => {
    if (!data) return null;

    const { filtered } = data.summary;

    // 类型分布数据
    const typeData: ChartDataItem[] = Object.entries(filtered.typeDistribution).map(
      ([type, count]) => ({
        type: getPRTypeLabel(type),
        value: count,
        color: getPRTypeColor(type),
      })
    );

    return { typeData };
  }, [data]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center">
          <Spin size="large" indicator={<LoadingOutlined spin />} />
          <div className="mt-2 text-gray-600 text-sm">正在获取PR数据...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-slate-200 bg-slate-50 p-3">
        <Alert
          message="获取PR数据失败"
          description={error}
          type="error"
          showIcon
          className="border-0 bg-transparent"
        />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="text-center py-8 bg-slate-50 border-slate-200">
        <PullRequestOutlined className="text-3xl text-slate-400 mb-2" />
        <div className="text-slate-500 mb-1">暂无 PR 数据</div>
        <div className="text-slate-400 text-sm">请点击上方"查询数据"按钮获取数据</div>
      </Card>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-4">
      {/* 紧凑核心指标 */}
      <div className="border border-slate-200 rounded-lg p-3 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center mb-3">
          <Title level={5} className="mb-1 text-slate-800">
            <PullRequestOutlined className="mr-1 text-slate-600" />
            PR 统计详情
          </Title>
          <Text type="secondary" className="text-xs">
            {dayjs(prStore.filters.startDate).format('MM/DD')} -{' '}
            {dayjs(prStore.filters.endDate).format('MM/DD')}
          </Text>
        </div>

        <Row gutter={8} className="text-center">
          <Col span={8}>
            <div className="bg-white/80 rounded p-2 border border-slate-100">
              <div className="text-lg font-bold text-slate-800">{summary.filtered.total}</div>
              <div className="text-xs text-slate-500">总数</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="bg-white/80 rounded p-2 border border-slate-100">
              <div className="text-lg font-bold text-emerald-600">{summary.filtered.merged}</div>
              <div className="text-xs text-slate-500">已合并</div>
            </div>
          </Col>
          <Col span={8}>
            <div className="bg-white/80 rounded p-2 border border-slate-100">
              <div className="text-lg font-bold text-slate-700">{summary.filtered.mergeRate}%</div>
              <div className="text-xs text-slate-500">合并率</div>
            </div>
          </Col>
        </Row>
      </div>

      {/* 类型分布 */}
      {chartData && chartData.typeData.length > 0 && (
        <Card className="p-3 border-slate-200">
          <div className="mb-3">
            <Text strong className="text-sm text-slate-800">
              类型分布
            </Text>
          </div>
          <SimpleChart data={chartData.typeData} />
        </Card>
      )}

      {/* PR明细 */}
      <PRDetails />
    </div>
  );
}

// PR明细组件
function PRDetails() {
  const { data } = useSnapshot(prStore);

  if (!data) return null;

  const { details } = data;

  // 合并所有类型的PR并按时间排序
  const getAllPRs = (periodDetails: Record<string, readonly any[]>) => {
    const allPRs = Object.values(periodDetails).flat();
    return allPRs
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  };

  const filteredPRs = getAllPRs(details.filtered);

  const columns = [
    {
      title: 'PR',
      dataIndex: 'number',
      key: 'number',
      width: 80,
      render: (number: number, record: any) => (
        <a
          href={record.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 font-medium text-xs"
        >
          #{number}
        </a>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: any) => (
        <div>
          <div className="font-medium text-gray-800 mb-1 text-sm">{title}</div>
          <div className="flex items-center space-x-1">
            <Tag color={getPRTypeColor(record.type)} className="text-xs">
              {getPRTypeLabel(record.type)}
            </Tag>
            {record.state === 'closed' && record.merged_at && (
              <Tag color="success" className="text-xs">
                已合并
              </Tag>
            )}
            {record.state === 'closed' && !record.merged_at && (
              <Tag color="error" className="text-xs">
                已关闭
              </Tag>
            )}
            {record.state === 'open' && (
              <Tag color="processing" className="text-xs">
                进行中
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: '作者',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user: any) => (
        <div className="flex items-center">
          <Avatar src={user.avatar_url} size="small" className="mr-2" />
          <div className="text-xs font-medium text-gray-800">{user.login}</div>
        </div>
      ),
    },
    {
      title: '仓库',
      dataIndex: 'repo',
      key: 'repo',
      width: 80,
      render: (repo: string) => {
        const repoName = repo.split('/').pop();
        return (
          <Tag color="blue" className="text-xs font-medium">
            {repoName}
          </Tag>
        );
      },
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 100,
      render: (created_at: string, record: any) => (
        <div className="text-xs">
          <div className="text-gray-600">{dayjs(created_at).format('MM-DD HH:mm')}</div>
          {record.merged_at && (
            <div className="text-green-600">合并 {dayjs(record.merged_at).format('MM-DD')}</div>
          )}
        </div>
      ),
    },
    {
      title: '代码变更',
      key: 'changes',
      width: 100,
      render: (record: any) => (
        <div className="text-center">
          <div className="bg-gray-50 rounded p-1">
            <div className="text-xs mb-1">
              <span className="text-green-600 font-medium">+{record.additions}</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-red-600 font-medium">-{record.deletions}</span>
            </div>
            <div className="text-xs text-gray-500">{record.changed_files} 文件</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Card className="p-3 border-slate-200">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div>
            <Text strong className="text-sm text-slate-800">
              PR 明细列表
            </Text>
            <div className="text-xs text-slate-500">共 {filteredPRs.length} 个 PR</div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded border border-slate-200">
        <Table
          columns={columns}
          dataSource={filteredPRs}
          rowKey="number"
          size="small"
          scroll={{ x: 600 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showQuickJumper: false,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            className: 'px-3 py-2 bg-slate-50',
            size: 'small',
          }}
          className="custom-table"
          rowClassName={record =>
            record.state === 'closed' && record.merged_at
              ? 'bg-emerald-50 hover:bg-emerald-100'
              : record.state === 'open'
                ? 'bg-slate-50 hover:bg-slate-100'
                : 'hover:bg-slate-50'
          }
        />
      </div>
    </Card>
  );
}
