'use client';

import { feedbackStore } from '@/app/store/feedbackStore';
import { LineChartOutlined } from '@ant-design/icons';
import { Badge, Button, Card, Tabs } from 'antd';
import { useSnapshot } from 'valtio';
import IssueDataDisplay from './IssueDataDisplay';
import IssueMetrics from './IssueMetrics';

export default function IssueDetails() {
  const { issueResponseTimes, filters } = useSnapshot(feedbackStore);

  // 生成标签文字
  const getTabTitle = () => {
    return filters.repo ? `待响应 Issue` : `待响应 Issue (全部)`;
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-2xl border-0">
      <Tabs
        defaultActiveKey="issue-metrics"
        type="card"
        items={[
          {
            key: 'issue-metrics',
            label: <span className="px-2">Issue 表现</span>,
            children: <IssueMetrics />,
          },
          {
            key: 'unresponded-issues',
            label: (
              <Badge
                count={issueResponseTimes?.filter(i => !i.hasResponse).length || 0}
                color="#f50"
              >
                <span className="px-2">{getTabTitle()}</span>
              </Badge>
            ),
            children: <IssueDataDisplay dataType="unresponded-issues" />,
          },
          {
            key: 'issue-response-times',
            label: <span className="px-2">响应时间分析</span>,
            children: <IssueDataDisplay dataType="issue-response-times" />,
          },
        ]}
        tabBarExtraContent={
          <Button
            type="primary"
            icon={<LineChartOutlined />}
            href="https://ossinsight.io/"
            target="_blank"
            ghost
            className="rounded-xl"
          >
            查看 OSS Insight 仓库指标
          </Button>
        }
      />
    </Card>
  );
}
