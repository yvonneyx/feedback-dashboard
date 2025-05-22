'use client';

import DateRangePicker from '@/app/components/DateRangePicker';
import TechStackFilter from '@/app/components/TechStackFilter';
import {
  feedbackStore,
  fetchFeedbackData,
  fetchIssueResponseTimes,
} from '@/app/store/feedbackStore';
import {
  FileTextOutlined,
  GithubOutlined,
  LineChartOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Divider, Tabs, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import DocDetails from './components/DocDetails';
import IssueDetails from './components/IssueDetails';
import KeyMetrics from './components/KeyMetrics';

const { Title, Text } = Typography;

export default function Home() {
  const { filters, error } = useSnapshot(feedbackStore);
  const [activeTab, setActiveTab] = useState('issue-details');

  useEffect(() => {
    fetchFeedbackData();
    fetchIssueResponseTimes();
  }, [filters.repo, filters.startDate, filters.endDate]);

  return (
    <div className="min-h-screen bg-[#F5F7FF] text-slate-700 font-['Inter',system-ui,sans-serif] texture-bg">
      {/* 顶部装饰彩带 - 更细致一些 */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 shadow-sm"></div>

      {/* 整体布局容器 */}
      <div className="py-6 px-4 md:px-6 max-w-7xl mx-auto fade-in">
        {/* 页面标题和筛选区域 */}
        <header className="mb-6 relative fade-in" style={{ animationDelay: '0.1s' }}>
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
                  数据更新至{' '}
                  {new Date().toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
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

          <Card
            className="rounded-xl border-0 shadow-md overflow-hidden"
            bodyStyle={{ padding: '16px' }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TechStackFilter />
              <DateRangePicker />
            </div>
          </Card>
        </header>

        {/* 关键指标 */}
        <div className="transition-all duration-300">
          <KeyMetrics />
        </div>

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

        {/* 标签页内容区 */}
        <Card
          className="rounded-xl border-0 shadow-md overflow-hidden hover:shadow-lg transition-all duration-300"
          bodyStyle={{ padding: 0 }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type="card"
            className="custom-tabs data-tabs"
            tabBarStyle={{
              background: 'linear-gradient(to right, rgba(237,242,255,0.7), rgba(224,231,255,0.5))',
              padding: '12px 16px 0',
              marginBottom: 0,
            }}
            items={[
              {
                key: 'issue-details',
                label: (
                  <span className="flex items-center px-3 py-1.5">
                    <GithubOutlined className="mr-2" />
                    Issue 处理
                  </span>
                ),
                children: (
                  <div className="p-4">
                    <IssueDetails />
                  </div>
                ),
              },
              {
                key: 'doc-details',
                label: (
                  <span className="flex items-center px-3 py-1.5">
                    <FileTextOutlined className="mr-2" />
                    文档用户反馈
                  </span>
                ),
                children: (
                  <div className="p-4">
                    <DocDetails />
                  </div>
                ),
              },
            ]}
          />
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
