'use client';

import CommunityDashboard from '@/app/components/CommunityDashboard';
import TechStackFilter from '@/app/components/TechStackFilter';
import {
  ALL_PRODUCTS,
  feedbackStore,
  fetchFeedbackData,
  fetchIssueResponseTimes,
} from '@/app/store/feedbackStore';
import { fetchPRData } from '@/app/store/prStore';
import { LineChartOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, DatePicker, Divider, Space, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useState } from 'react';
import { useSnapshot } from 'valtio';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function Home() {
  const { filters, error, loading } = useSnapshot(feedbackStore);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs(filters.startDate),
    dayjs(filters.endDate),
  ]);
  const [selectedRepo, setSelectedRepo] = useState<string>(filters.repo);

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
  const handleApplyFilter = async () => {
    try {
      console.log('🎯 应用筛选条件:', {
        选择的仓库: selectedRepo,
        日期范围: [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
      });

      // 更新 store 中的筛选条件
      feedbackStore.filters.startDate = dateRange[0].toISOString();
      feedbackStore.filters.endDate = dateRange[1].toISOString();
      feedbackStore.filters.repo = selectedRepo;

      console.log('📝 更新后的全局筛选条件:', {
        startDate: feedbackStore.filters.startDate,
        endDate: feedbackStore.filters.endDate,
        repo: feedbackStore.filters.repo,
      });

      // 计算 PR 筛选参数
      const prRepos =
        !selectedRepo || selectedRepo === '' || selectedRepo === 'all'
          ? ALL_PRODUCTS.map(product => product.value)
          : [selectedRepo];

      console.log('🎯 计算出的PR仓库列表:', prRepos);

      // 检查网络连接
      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络后重试');
      }

      // 串行触发数据加载，避免并发请求过多
      console.log('🔄 开始获取反馈数据...');
      await fetchFeedbackData();

      console.log('🔄 开始获取Issue响应时间...');
      await fetchIssueResponseTimes();

      console.log('🔄 开始获取PR数据...');
      await fetchPRData({
        repos: prRepos,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      });

      console.log('✅ 所有数据获取完成');
    } catch (error) {
      console.error('❌ 查询数据失败:', error);
      // 错误会由各个store自行处理和显示
    }
  };

  // 格式化日期显示
  const formatDateRange = () => {
    const startDate = dayjs(filters.startDate).format('YYYY年MM月DD日');
    const endDate = dayjs(filters.endDate).format('YYYY年MM月DD日');
    return `${startDate} - ${endDate}`;
  };

  // 快捷日期按钮处理函数
  const handleQuickDateSelect = async (days: number) => {
    try {
      const endDate = dayjs();
      const startDate = dayjs().subtract(days, 'day');

      // 更新本地状态
      setDateRange([startDate, endDate]);

      // 更新 feedbackStore 的日期筛选
      feedbackStore.filters.startDate = startDate.toISOString();
      feedbackStore.filters.endDate = endDate.toISOString();

      // 计算 PR 筛选参数
      const prRepos =
        !selectedRepo || selectedRepo === '' || selectedRepo === 'all'
          ? ALL_PRODUCTS.map(product => product.value)
          : [selectedRepo];

      console.log('🎯 快捷日期选择:', {
        天数: days,
        开始日期: startDate.format('YYYY-MM-DD'),
        结束日期: endDate.format('YYYY-MM-DD'),
        仓库列表: prRepos,
      });

      // 检查网络连接
      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络后重试');
      }

      // 串行触发数据加载，避免并发请求过多
      console.log('🔄 开始获取反馈数据...');
      await fetchFeedbackData();

      console.log('🔄 开始获取Issue响应时间...');
      await fetchIssueResponseTimes();

      console.log('🔄 开始获取PR数据...');
      await fetchPRData({
        repos: prRepos,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
      });

      console.log('✅ 所有数据获取完成');
    } catch (error) {
      console.error('❌ 快捷日期选择数据获取失败:', error);
      // 错误会由各个store自行处理和显示
    }
  };

  return (
    <>
      {/* 自定义样式 */}
      <style jsx global>{`
        .custom-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          border-bottom: 2px solid #e2e8f0 !important;
          color: #374151 !important;
          font-weight: 600 !important;
          padding: 16px 12px !important;
        }

        .custom-table .ant-table-tbody > tr > td {
          padding: 16px 12px !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }

        .custom-table .ant-table-tbody > tr:hover > td {
          background: #f8fafc !important;
        }

        .custom-table .ant-pagination {
          margin: 0 !important;
        }

        .fade-in {
          animation: fadeIn 0.6s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .pulse-animation {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        /* 优化进度条样式 */
        .ant-progress-line {
          border-radius: 8px;
        }

        .ant-progress-inner {
          border-radius: 8px;
          background: #f0f0f0;
        }

        .ant-progress-bg {
          border-radius: 8px;
          height: 8px !important;
        }

        /* 优化卡片阴影 */
        .ant-card {
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .ant-card:hover {
          transform: translateY(-2px);
        }

        /* 优化标签页样式 */
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab {
          border-radius: 8px 8px 0 0;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          transition: all 0.3s ease;
        }

        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active {
          background: white;
          border-bottom-color: white;
        }

        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab:hover {
          background: #f1f5f9;
        }
      `}</style>

      <div
        className="min-h-screen text-slate-700 font-['Inter',system-ui,sans-serif]"
        style={{
          // background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          background:
            "url('https://mass-office.alipay.com/huamei_koqzbu/afts/img/kiZORZ0SvXkAAAAAAAAAABAADnV5AQBr/original') center center / cover no-repeat",
          minWidth: '1200px',
          overflowX: 'auto',
        }}
      >
        {/* 整体布局容器 */}
        <div className="py-4 px-4 md:px-6 max-w-7xl mx-auto fade-in">
          {/* 大容器卡片 */}
          <Card
            className="rounded-xl border border-slate-200 shadow-lg overflow-hidden mb-4"
            bodyStyle={{ padding: '16px' }}
            style={{ backgroundColor: '#ffffff' }}
          >
            {/* 页面标题和导航区域 */}
            <div className="mb-4">
              <div className="flex flex-col md:flex-row items-center justify-between mb-3 gap-3">
                <div className="flex items-center">
                  <div
                    className="bg-slate-100 p-2 rounded-lg mr-3 shadow-sm pulse-animation"
                    style={{ animationDuration: '3s' }}
                  >
                    <LineChartOutlined className="text-lg text-slate-600" />
                  </div>
                  <div>
                    <Title level={4} className="mb-0 mt-0 font-bold text-slate-800">
                      AntV 社区数据看板
                    </Title>
                    <Text type="secondary" className="text-xs text-slate-500">
                      统计范围：{formatDateRange()}
                    </Text>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    icon={<UserOutlined />}
                    className="rounded-lg shadow-sm transition-all duration-300 border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-700"
                    size="small"
                    onClick={() => (window.location.href = '/contributors')}
                  >
                    贡献者统计
                  </Button>
                  <Button
                    type="primary"
                    icon={<TeamOutlined />}
                    className="rounded-lg shadow-sm transition-all duration-300 border-0 bg-slate-700 hover:bg-slate-800"
                    size="small"
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

            <Divider className="my-4 border-slate-200" />

            {/* 筛选器 */}
            <div className="mb-4">
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1">
                  <div className="text-xs text-slate-600 mb-1">日期范围</div>
                  <Space direction="vertical" size="small" className="w-full">
                    <div className="flex items-center space-x-2">
                      <RangePicker
                        value={dateRange}
                        onChange={dates => {
                          if (dates && dates[0] && dates[1]) {
                            setDateRange([dates[0], dates[1]]);
                            feedbackStore.filters.startDate = dates[0].toISOString();
                            feedbackStore.filters.endDate = dates[1].toISOString();
                          }
                        }}
                        size="small"
                        className="flex-1"
                      />
                      <Button
                        size="small"
                        type="text"
                        onClick={() => handleQuickDateSelect(14)}
                        className="text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                      >
                        近两周
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        onClick={() => handleQuickDateSelect(30)}
                        className="text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                      >
                        近一个月
                      </Button>
                    </div>
                  </Space>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-600 mb-1">选择仓库</div>
                  <div className="w-full">
                    <TechStackFilter value={selectedRepo} onChange={handleRepoChange} />
                  </div>
                </div>
                <div>
                  <Button
                    type="primary"
                    onClick={handleApplyFilter}
                    loading={loading}
                    className="bg-slate-700 hover:bg-slate-800 border-0"
                    size="middle"
                  >
                    查询数据
                  </Button>
                </div>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-3">
                <Alert
                  description={error}
                  type="info"
                  showIcon
                  className="rounded-xl border-slate-200 bg-slate-50 shadow-sm animate-fadeIn"
                />
              </div>
            )}

            <Divider className="my-4 border-slate-200" />

            {/* 社区数据大盘 */}
            <CommunityDashboard />
          </Card>

          <footer className="mt-4 mb-4 text-center text-slate-500 text-xs">
            <Divider className="opacity-50 border-slate-300" />
            <div className="flex items-center justify-center gap-1">
              <span>AntV 社区数据看板</span>
              <span className="inline-block mx-1.5 h-1 w-1 rounded-full bg-slate-300"></span>
              <span>有疑问请联系 @半璇</span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
