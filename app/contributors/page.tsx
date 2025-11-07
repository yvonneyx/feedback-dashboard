'use client';

import { BarChartOutlined, LineChartOutlined, TeamOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Divider, Typography } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import ContributorsFilter from '../components/ContributorsFilter';
import ContributorsGraph from '../components/ContributorsGraph';
import ContributorsList from '../components/ContributorsList';
import ContributorsStats from '../components/ContributorsStats';
import { contributorsStore, fetchContributors } from '../store/contributorsStore';

const { Title, Text } = Typography;

export default function ContributorsPage() {
  const { error, filters } = useSnapshot(contributorsStore);

  // 首次加载时获取数据
  useEffect(() => {
    fetchContributors();

    // 添加必要的 @ant-design/plots 样式
    const style = document.createElement('style');
    style.textContent = `
      .pie-container {
        position: relative;
        width: 100%;
        height: 280px;
      }
      .pie-container > div {
        width: 100% !important;
        height: 100% !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
                  <BarChartOutlined className="text-xl text-indigo-500" />
                </div>
                <div>
                  <Title level={4} className="mb-0 mt-0 font-bold text-slate-800">
                    AntV 社区贡献者统计
                  </Title>
                  <Text type="secondary" className="text-xs">
                    统计范围：{formatDateRange()}
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  icon={<LineChartOutlined />}
                  className="rounded-lg shadow-sm transition-all duration-300"
                  size="middle"
                  onClick={() => (window.location.href = '/')}
                >
                  返回答疑看板
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
            <ContributorsFilter />
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

          {/* 统计卡片 */}
          <div className="mb-6 mt-4">
            <ContributorsStats />
          </div>

          <Divider className="my-6" />

          {/* 贡献者列表 */}
          <div>
            <ContributorsList />
          </div>
          <ContributorsGraph />
        </Card>

        <footer className="mt-8 mb-6 text-center text-gray-500 text-xs">
          <Divider className="opacity-50" />
          <div className="flex items-center justify-center gap-1">
            <span>AntV 社区贡献者统计</span>
            <span className="inline-block mx-1.5 h-1 w-1 rounded-full bg-gray-300"></span>
            <span>有疑问请联系 @半璇</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
