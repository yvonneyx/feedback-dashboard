'use client';

import React, { useEffect } from 'react';
import { DatePicker, Space } from 'antd';
import type { TimeRangePickerProps } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useSnapshot } from 'valtio';
import { feedbackStore, updateDateRange, fetchFeedbackData } from '@/app/store/feedbackStore';

const { RangePicker } = DatePicker;

export default function DateRangePicker() {
  const snapshot = useSnapshot(feedbackStore);

  // 预设时间范围选项
  const rangePresets: TimeRangePickerProps['presets'] = [
    { label: '最近7天', value: [dayjs().subtract(7, 'd'), dayjs()] },
    { label: '最近14天', value: [dayjs().subtract(14, 'd'), dayjs()] },
    { label: '最近30天', value: [dayjs().subtract(30, 'd'), dayjs()] },
    { label: '最近90天', value: [dayjs().subtract(90, 'd'), dayjs()] },
    { label: '本月', value: [dayjs().startOf('month'), dayjs()] },
    {
      label: '上个月',
      value: [
        dayjs().subtract(1, 'month').startOf('month'),
        dayjs().subtract(1, 'month').endOf('month'),
      ],
    },
  ];

  // 处理日期范围变化
  const onRangeChange = (dates: null | (Dayjs | null)[], dateStrings: string[]) => {
    if (dates && dates[0] && dates[1]) {
      updateDateRange(dates[0].toISOString(), dates[1].toISOString());
      fetchFeedbackData();
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xs text-gray-500 mb-2 font-medium">时间段筛选</h2>
      <div className="py-2 px-3 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-100 shadow-inner">
        <RangePicker
          presets={rangePresets}
          onChange={onRangeChange}
          className="w-full rounded-lg transition-all duration-300"
          defaultValue={[dayjs(snapshot.filters.startDate), dayjs(snapshot.filters.endDate)]}
          allowClear={false}
          variant="borderless"
          size="middle"
        />
      </div>
    </div>
  );
}
