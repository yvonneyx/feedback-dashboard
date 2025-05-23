'use client';

import React, { useEffect, useState } from 'react';

interface DataItem {
  type: string;
  value: number;
  color: string;
}

interface SimpleChartProps {
  data: DataItem[];
  title?: string;
}

export default function SimpleChart({ data, title }: SimpleChartProps) {
  const [DynamicPie, setDynamicPie] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    // 动态导入以避免SSR问题
    import('@ant-design/plots')
      .then(({ Pie }) => {
        setDynamicPie(() => Pie);
      })
      .catch(err => {
        console.error('Failed to load @ant-design/plots:', err);
      });
  }, []);

  if (!data || data.length === 0) {
    return null;
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // 饼图配置
  const config = {
    appendPadding: 30,
    data,
    angleField: 'value',
    colorField: 'type',
    radius: 0.6,
    innerRadius: 0.45,
    padAngle: 0.01,
    label: {
      position: 'outside',
      text: (data: DataItem) => `${data.value}`,
      style: {
        fontSize: 12,
        fontWeight: 500,
        textAlign: 'center',
        fill: '#666',
        connectorDistance: 10,
      },
    },
    state: {
      active: { opacity: 1, lineWidth: 0 },
      inactive: { opacity: 0.5 },
    },
    interaction: {
      elementHighlight: true,
    },
    statistic: {
      title: {
        style: {
          fontSize: '14px',
          color: '#697A8C',
          fontWeight: 'normal',
        },
        formatter: () => '总计',
      },
      content: {
        style: {
          fontSize: '20px',
          color: '#1677FF',
          fontWeight: 'bold',
        },
        formatter: () => `${total}`,
      },
    },
    legend: {
      layout: 'horizontal',
      position: 'bottom',
      flipPage: false,
      maxRow: 2,
      itemSpacing: 10,
      itemName: {
        style: {
          fontSize: 12,
        },
        formatter: (text: string) => {
          // 找到对应的数据项
          const dataItem = data.find(d => d.type === text);
          if (dataItem) {
            const percentage = Math.round((dataItem.value / total) * 100);
            return `${text}: ${dataItem.value}人 (${percentage}%)`;
          }
          return text;
        },
      },
    },
    // 使用自定义颜色
    color: (datum: any) => {
      const item = data.find(d => d.type === datum.type);
      return item ? item.color : '#8c8c8c';
    },
    animation: {
      appear: {
        animation: 'fade-in',
        duration: 1500,
      },
    },
  };

  return (
    <div className="w-full">
      {title && <div className="text-center font-medium mb-2 text-gray-600">{title}</div>}
      <div className="pie-container" style={{ height: '280px', width: '100%' }}>
        {DynamicPie ? (
          <DynamicPie {...config} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="animate-pulse">加载图表中...</div>
          </div>
        )}
      </div>
    </div>
  );
}
