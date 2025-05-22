'use client';

import DateRangePicker from '@/app/components/DateRangePicker';
import TechStackFilter from '@/app/components/TechStackFilter';
import {
  feedbackStore,
  fetchFeedbackData,
  fetchIssueResponseTimes,
} from '@/app/store/feedbackStore';
import { LineChartOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import DocDetails from './components/DocDetails';
import IssueDetails from './components/IssueDetails';
import KeyMetrics from './components/KeyMetrics';

const { Title, Text } = Typography;

export default function Home() {
  const { filters, error, loading } = useSnapshot(feedbackStore);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs(filters.startDate),
    dayjs(filters.endDate),
  ]);
  const [selectedRepo, setSelectedRepo] = useState<string>(filters.repo);

  // 仅在首次加载时获取数据
  useEffect(() => {
    // 初始数据加载
    fetchFeedbackData();
    fetchIssueResponseTimes();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 处理日期范围变化
  const handleDateChange = (dates: [Dayjs, Dayjs]) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates);
    }
  };

  // 处理仓库选择变化
  const handleRepoChange = (value: string) => {
    setSelectedRepo(value);
  };

  // 应用筛选条件
  const handleApplyFilter = () => {
    // 更新 store 中的筛选条件
    feedbackStore.filters.startDate = dateRange[0].toISOString();
    feedbackStore.filters.endDate = dateRange[1].toISOString();
    feedbackStore.filters.repo = selectedRepo;

    // 触发数据加载
    fetchFeedbackData();
    fetchIssueResponseTimes();
  };

  // 格式化日期显示
  const formatDateRange = () => {
    const startDate = dayjs(filters.startDate).format('YYYY年MM月DD日');
    const endDate = dayjs(filters.endDate).format('YYYY年MM月DD日');
    return `${startDate} - ${endDate}`;
  };

  return (
    <div
      className="min-h-screen text-slate-700 font-['Inter',system-ui,sans-serif]"
      style={{
        background:
          "url('https://mass-office.alipay.com/huamei_koqzbu/afts/img/kiZORZ0SvXkAAAAAAAAAABAADnV5AQBr/original') center center / cover no-repeat",
        minWidth: '1200px',
        overflowX: 'auto',
      }}
    >
      {/* 整体布局容器 */}
      <div className="py-6 px-4 md:px-6 max-w-7xl mx-auto fade-in">
        {/* 大容器卡片 */}
        <Card
          className="rounded-xl border-0 shadow-lg overflow-hidden mb-6"
          bodyStyle={{ padding: '24px' }}
          style={{ backgroundColor: '#FAFCFD' }}
        >
          {/* 页面标题和导航区域 */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between mb-5 gap-4">
              <div className="flex items-center">
                <div
                  className="bg-indigo-500/10 p-2.5 rounded-lg mr-3 shadow-sm pulse-animation"
                  style={{ animationDuration: '3s' }}
                >
                  <LineChartOutlined className="text-xl text-indigo-500" />
                </div>
                <div>
                  <Title level={4} className="mb-0 mt-0 font-bold text-slate-800">
                    AntV 社区答疑看板
                  </Title>
                  <Text type="secondary" className="text-xs">
                    统计范围：{formatDateRange()}
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  icon={<UserOutlined />}
                  className="rounded-lg shadow-sm transition-all duration-300"
                  size="middle"
                  onClick={() => (window.location.href = '/contributors')}
                >
                  贡献者统计
                </Button>
                <Button
                  type="primary"
                  icon={<TeamOutlined />}
                  className="rounded-lg shadow-sm transition-all duration-300 border-0 bg-gradient-to-r from-indigo-500 to-blue-500 hover:opacity-90"
                  size="middle"
                  onClick={() =>
                    window.open(
                      'https://deepinsight.alipay.com/view.htm?reportId=D2025030600161401000023955562',
                      '_blank'
                    )
                  }
                >
                  查看内部答疑看板
                </Button>
              </div>
            </div>
          </div>

          <Divider className="my-6" />

          {/* 筛选器 */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-2">日期范围</div>
                <div className="w-full">
                  <DateRangePicker value={dateRange} onChange={handleDateChange} />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-2">选择仓库</div>
                <div className="w-full">
                  <TechStackFilter value={selectedRepo} onChange={handleRepoChange} />
                </div>
              </div>
              <div>
                <Button
                  type="primary"
                  onClick={handleApplyFilter}
                  loading={loading}
                  className="bg-gradient-to-r from-indigo-500 to-blue-500 border-0 hover:opacity-90"
                >
                  应用筛选
                </Button>
              </div>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4">
              <Alert
                description={error}
                type="info"
                showIcon
                className="rounded-xl border-0 shadow-sm animate-fadeIn"
              />
            </div>
          )}

          {/* 关键指标 */}
          <div className="mb-6 mt-4">
            <KeyMetrics />
          </div>

          <Divider className="my-6" />

          {/* Issue处理区域 */}
          <div className="mb-8">
            <Text
              strong
              className="text-base mb-3 block text-slate-700"
              style={{ fontSize: '16px' }}
            >
              Issue 处理
            </Text>
            <IssueDetails />
          </div>

          <Divider className="my-6" />

          {/* 文档用户反馈区域 */}
          <div>
            <Text
              strong
              className="text-base mb-3 block text-slate-700"
              style={{ fontSize: '16px' }}
            >
              文档用户反馈
            </Text>
            <DocDetails />
          </div>
        </Card>

        <footer className="mt-8 mb-6 text-center text-gray-500 text-xs">
          <Divider className="opacity-50" />
          <div className="flex items-center justify-center gap-1">
            <span>AntV 社区答疑数据看板</span>
            <span className="inline-block mx-1.5 h-1 w-1 rounded-full bg-gray-300"></span>
            <span>有疑问请联系 @半璇</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
