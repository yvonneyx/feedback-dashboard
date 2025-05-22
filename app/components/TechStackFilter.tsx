'use client';

import { ALL_PRODUCTS } from '@/app/store/feedbackStore';
import { Select } from 'antd';

interface TechStackFilterProps {
  value?: string;
  onChange?: (value: string) => void;
}

export default function TechStackFilter({ value, onChange }: TechStackFilterProps) {
  const handleRepoChange = (selectedValue: string) => {
    if (onChange) {
      onChange(selectedValue);
    }
  };

  return (
    <Select
      placeholder="选择仓库（不选则查询全部）"
      className="w-full"
      value={value || undefined}
      onChange={handleRepoChange}
      options={[{ label: '全部仓库', value: '' }, ...ALL_PRODUCTS]}
      allowClear
    />
  );
}
