'use client';

import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface DateRangePickerProps {
  value?: [Dayjs, Dayjs];
  onChange?: (dates: [Dayjs, Dayjs]) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  // 处理日期范围变化
  const handleDateChange = (dates: null | (Dayjs | null)[]) => {
    if (dates && dates[0] && dates[1] && onChange) {
      onChange([dates[0], dates[1]] as [Dayjs, Dayjs]);
    }
  };

  return (
    <RangePicker
      className="w-full"
      value={value}
      onChange={handleDateChange}
      allowClear={false}
      placeholder={['开始日期', '结束日期']}
    />
  );
}
