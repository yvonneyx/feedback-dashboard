'use client';

import { InfoCircleOutlined } from '@ant-design/icons';
import { Button, DatePicker, Select, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { useSnapshot } from 'valtio';
import {
  contributorsStore,
  fetchContributors,
  updateContributorDateRange,
  updateSelectedRepos,
} from '../store/contributorsStore';
import { ALL_PRODUCTS } from '../store/feedbackStore';

const { RangePicker } = DatePicker;

export default function ContributorsFilter() {
  const { filters, loading } = useSnapshot(contributorsStore);

  // 处理日期选择变化
  const handleDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      const startDate = dates[0].format('YYYY-MM-DD');
      const endDate = dates[1].format('YYYY-MM-DD');
      updateContributorDateRange(startDate, endDate);
    }
  };

  // 处理仓库选择变化
  const handleRepoChange = (values: any) => {
    // 使用类型断言解决只读数组问题
    updateSelectedRepos(values as string[]);
  };

  // 应用筛选条件
  const handleApplyFilter = () => {
    fetchContributors();
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 items-end">
      <div className="flex-1">
        <div className="text-sm text-gray-500 mb-2 flex items-center">
          日期范围
          <Tooltip title="默认从今年1月1日开始统计">
            <InfoCircleOutlined className="ml-2 text-blue-500" />
          </Tooltip>
        </div>
        <RangePicker
          className="w-full"
          value={[dayjs(filters.startDate), dayjs(filters.endDate)]}
          onChange={handleDateChange}
          allowClear={false}
          placeholder={['开始日期(默认1.1)', '结束日期']}
        />
      </div>

      <div className="flex-1">
        <div className="text-sm text-gray-500 mb-2 flex items-center">
          选择仓库
          <Tooltip title="不选择仓库将查询所有仓库的贡献者，并在统计卡片中显示各栈贡献者数量">
            <InfoCircleOutlined className="ml-2 text-blue-500" />
          </Tooltip>
        </div>
        <Select
          mode="multiple"
          placeholder="选择仓库（不选则查询全部并显示各栈数量）"
          className="w-full"
          value={filters.repos}
          onChange={handleRepoChange}
          options={ALL_PRODUCTS}
          maxTagCount={3}
        />
      </div>

      <div>
        <Button type="primary" onClick={handleApplyFilter} loading={loading}>
          应用筛选
        </Button>
      </div>
    </div>
  );
}
