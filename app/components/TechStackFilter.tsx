'use client';

import { ALL_PRODUCTS } from '@/app/store/feedbackStore';
import { Select } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TechStackFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function TechStackFilter({ value, onChange }: TechStackFilterProps) {
  const [internalValue, setInternalValue] = useState<string[]>(value);
  const isUpdatingFromExternal = useRef(false);
  const lastExternalValue = useRef<string[]>(value);

  // 数组比较函数
  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
  };

  // 当外部value变化时，同步内部状态
  useEffect(() => {
    if (!arraysEqual(value, lastExternalValue.current)) {
      console.log('🔄 TechStackFilter: 外部value变化，同步内部状态', {
        外部值: value,
        上次外部值: lastExternalValue.current,
      });

      isUpdatingFromExternal.current = true;
      setInternalValue(value);
      lastExternalValue.current = [...value];

      // 下一个事件循环后重置标志
      setTimeout(() => {
        isUpdatingFromExternal.current = false;
      }, 0);
    }
  }, [value]);

  // 处理选择变化 - 立即触发onChange
  const handleRepoChange = useCallback(
    (selectedValues: string[]) => {
      console.log('📝 TechStackFilter: 选择变化，立即触发onChange', {
        选择值: selectedValues,
        当前内部值: internalValue,
        是否外部更新: isUpdatingFromExternal.current,
      });

      // 避免在外部更新过程中触发onChange
      if (isUpdatingFromExternal.current) {
        console.log('⏭️ TechStackFilter: 跳过onChange - 正在外部更新');
        return;
      }

      // 更新内部状态
      setInternalValue(selectedValues);

      // 立即触发onChange
      if (onChange) {
        console.log('🚀 TechStackFilter: 立即触发onChange', {
          新值: selectedValues,
        });
        onChange([...selectedValues]); // 创建新数组避免引用问题
      }
    },
    [onChange, internalValue]
  );

  useEffect(() => {
    console.log('🔄 TechStackFilter: 内部值变化，触发onChange', {
      新值: internalValue,
    });
    onChange(internalValue);
  }, [internalValue]);

  return (
    <Select
      mode="multiple"
      placeholder="选择仓库（不选则查询全部）"
      className="w-full"
      value={internalValue}
      onChange={handleRepoChange}
      options={ALL_PRODUCTS}
      allowClear
      maxTagTextLength={8}
    />
  );
}
