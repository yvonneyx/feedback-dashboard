'use client';

import { feedbackStore } from '@/app/store/feedbackStore';
import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useSnapshot } from 'valtio';

const { Title, Text } = Typography;

interface MonthlyIssueStatsProps {
  startDate: string;
  endDate: string;
}

export default function MonthlyIssueStats({ startDate, endDate }: MonthlyIssueStatsProps) {
  const { issueResponseTimes, issueAnalyticsLoading } = useSnapshot(feedbackStore);

  // 按月份分组数据
  const groupByMonth = () => {
    if (!issueResponseTimes || issueResponseTimes.length === 0) {
      return {};
    }

    const monthGroups: { [key: string]: any[] } = {};

    issueResponseTimes.forEach((issue: any) => {
      const month = dayjs(issue.created_at).format('YYYY-MM');
      if (!monthGroups[month]) {
        monthGroups[month] = [];
      }
      monthGroups[month].push(issue);
    });

    return monthGroups;
  };

  // 获取月份名称
  const getMonthName = (monthKey: string) => {
    return dayjs(monthKey).format('YYYY年MM月');
  };

  // 从URL中提取仓库名称
  const getRepoFromUrl = (url: string) => {
    if (!url) return '';
    try {
      const matches = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
      const repo = matches ? matches[1].split('/')[1] : '';
      if (repo === 'ant-design-charts') return 'Charts';
      return repo.toUpperCase();
    } catch {
      return '';
    }
  };

  // 表格列定义
  const columns: ColumnsType<any> = [
    {
      title: 'Issue #',
      dataIndex: 'number',
      key: 'number',
      width: 100,
      render: (text: string, record: any) => (
        <a href={record.html_url} target="_blank" rel="noopener noreferrer">
          #{text}
        </a>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string, record: any) => (
        <a href={record.html_url} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (text: string) => dayjs(text).format('YYYY-MM-DD'),
    },
    {
      title: '状态',
      dataIndex: 'state',
      key: 'state',
      width: 80,
      render: (text: string) => (
        <Tag color={text === 'open' ? 'green' : 'default'}>{text === 'open' ? '开放' : '关闭'}</Tag>
      ),
    },
    {
      title: '响应状态',
      key: 'hasResponse',
      width: 100,
      render: (_: any, record: any) => (
        <Tag color={record.hasResponse ? 'success' : 'warning'}>
          {record.hasResponse ? '已响应' : '未响应'}
        </Tag>
      ),
    },
    {
      title: '响应时间',
      key: 'responseTime',
      width: 120,
      render: (_: any, record: any) => {
        if (!record.hasResponse || !record.firstResponseTime) {
          return <Text type="secondary">-</Text>;
        }
        const hours = record.firstResponseTime;
        if (hours < 24) {
          return `${hours.toFixed(1)}小时`;
        }
        return `${(hours / 24).toFixed(1)}天`;
      },
    },
  ];

  const monthGroups = groupByMonth();
  const monthKeys = Object.keys(monthGroups).sort();
  const totalIssues = issueResponseTimes?.length || 0;

  if (issueAnalyticsLoading) {
    return (
      <Card loading={true}>
        <div style={{ minHeight: 200 }} />
      </Card>
    );
  }

  if (totalIssues === 0) {
    return (
      <Card>
        <Text type="secondary">该时间范围内没有找到Issue数据</Text>
      </Card>
    );
  }

  return (
    <div>
      {/* 总计卡片 */}
      <Card className="mb-4 rounded-xl border border-slate-200 shadow-sm">
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="总Issue数量"
              value={totalIssues}
              suffix="条"
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="月份数量"
              value={monthKeys.length}
              suffix="个月"
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="月均Issue数"
              value={monthKeys.length > 0 ? (totalIssues / monthKeys.length).toFixed(1) : 0}
              suffix="条/月"
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 按月份显示表格 */}
      {monthKeys.map(monthKey => {
        const monthData = monthGroups[monthKey];
        const respondedCount = monthData.filter((issue: any) => issue.hasResponse).length;
        const responseRate = ((respondedCount / monthData.length) * 100).toFixed(1);

        return (
          <Card
            key={monthKey}
            className="mb-4 rounded-xl border border-slate-200 shadow-sm"
            title={
              <div className="flex justify-between items-center">
                <span>{getMonthName(monthKey)}</span>
                <div className="flex gap-4">
                  <Text type="secondary">
                    总数: <Text strong>{monthData.length}</Text> 条
                  </Text>
                  <Text type="secondary">
                    已响应: <Text strong>{respondedCount}</Text> 条
                  </Text>
                  <Text type="secondary">
                    响应率: <Text strong>{responseRate}%</Text>
                  </Text>
                </div>
              </div>
            }
          >
            <Table
              columns={columns}
              dataSource={monthData}
              rowKey="number"
              pagination={false}
              size="small"
              scroll={{ x: 1000 }}
            />
          </Card>
        );
      })}
    </div>
  );
}
