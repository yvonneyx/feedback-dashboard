'use client';

import { Badge, Tabs } from 'antd';
import { useSnapshot } from 'valtio';
import { feedbackStore } from '../store/feedbackStore';
import DocDataDisplay from './DocDataDisplay';

export default function DocDetails() {
  const { data } = useSnapshot(feedbackStore);

  return (
    <div className="overflow-hidden">
      <Tabs
        defaultActiveKey="doc-suggestions"
        type="card"
        items={[
          {
            key: 'doc-suggestions',
            label: (
              <Badge
                count={data?.filter(i => !i.rating && i.isResolved === '0').length || 0}
                color="#f50"
              >
                <span className="px-2">文档建议</span>
              </Badge>
            ),
            children: <DocDataDisplay dataType="doc-suggestions" />,
          },
          {
            key: 'page-ratings',
            label: <span className="px-2">页面评价</span>,
            children: <DocDataDisplay dataType="page-ratings" />,
          },
        ]}
      />
    </div>
  );
}
