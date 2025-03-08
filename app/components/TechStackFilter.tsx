'use client';

import { ALL_PRODUCTS, feedbackStore, updateRepo } from '@/app/store/feedbackStore';
import { Radio, Space } from 'antd';
import { useSnapshot } from 'valtio';

export default function TechStackFilter() {
  const { filters } = useSnapshot(feedbackStore);

  const handleRepoChange = (e: any) => {
    updateRepo(e.target.value);
  };

  return (
    <div className="w-full">
      <h2 className="text-xs text-gray-500 mb-2 font-medium">选择产品</h2>
      <div className="py-2 px-3 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-100 shadow-inner">
        <Radio.Group
          value={filters.repo}
          onChange={handleRepoChange}
          buttonStyle="solid"
          className="w-full"
          size="small"
          style={{ height: '30px', alignContent: 'center' }}
        >
          <Space wrap size={[8, 10]}>
            <Radio.Button value="" className="rounded-lg" style={{ border: 'none' }}>
              全部产品
            </Radio.Button>
            {ALL_PRODUCTS.map(option => (
              <Radio.Button
                key={option.value}
                value={option.value}
                className="rounded-lg"
                style={{ border: 'none' }}
              >
                {option.label}
              </Radio.Button>
            ))}
          </Space>
        </Radio.Group>
      </div>
    </div>

    // <Card size="small" className="shadow-sm hover:shadow-md transition-all duration-300">
    //   <div className="flex items-center mb-2">
    //     <DatabaseOutlined className="mr-2" />
    //     <span className="text-gray-500 text-sm">选择产品</span>
    //   </div>
    //   <Radio.Group
    //     value={filters.repo}
    //     onChange={handleRepoChange}
    //     buttonStyle="solid"
    //     className="w-full"
    //     size="small"
    //   >
    //     <Space wrap size={[8, 10]}>
    //       <Radio.Button value="" className="rounded-lg">
    //         全部产品
    //       </Radio.Button>
    //       {ALL_PRODUCTS.map(option => (
    //         <Radio.Button key={option.value} value={option.value} className="rounded-lg">
    //           {option.label}
    //         </Radio.Button>
    //       ))}
    //     </Space>
    //   </Radio.Group>
    // </Card>
  );
}
