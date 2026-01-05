'use client';

import CommunityDashboard from '@/app/components/CommunityDashboard';
import TechStackFilter from '@/app/components/TechStackFilter';
import {
  ALL_PRODUCTS,
  clearIssueDataCache,
  feedbackStore,
  fetchFeedbackData,
  fetchFeedbackDataWithCancel,
  fetchIssueResponseTimes,
  fetchIssueResponseTimesWithCancel,
  updateDateRange,
  updateRepos,
} from '@/app/store/feedbackStore';
import { fetchPRData, fetchPRDataWithCancel, prStore } from '@/app/store/prStore';
import { LineChartOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Button, Card, DatePicker, Divider, Space, Typography } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 使用useRef跟踪首次加载状态，避免依赖项问题
  const hasInitialLoadedRef = useRef(false);

  // 请求控制器ref，用于取消请求
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentRequestRepos = useRef<string[]>([]); // 当前正在请求的仓库列表

  // 初始化日期范围
  const initDateRange = (): [Dayjs, Dayjs] => {
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');

    if (urlStartDate && urlEndDate) {
      return [dayjs(urlStartDate), dayjs(urlEndDate)];
    }
    return [dayjs().startOf('month'), dayjs()];
  };

  // 初始化仓库选择
  const initRepos = (): string[] => {
    const urlRepos = searchParams.get('repos');
    if (urlRepos) {
      try {
        // 对URL编码的仓库参数进行解码
        const decodedRepos = decodeURIComponent(urlRepos);
        return decodedRepos.split(',').filter(Boolean);
      } catch (error) {
        console.error('❌ initRepos解码失败:', error);
        return urlRepos.split(',').filter(Boolean);
      }
    }
    return [];
  };

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(initDateRange);
  const [selectedRepos, setSelectedRepos] = useState<string[]>(initRepos);
  const [error, setError] = useState<string | null>(null);

  // 检查两个仓库数组是否有交集
  const hasRepoIntersection = (repos1: string[], repos2: string[]) => {
    return repos1.some(repo => repos2.includes(repo));
  };

  // 智能取消请求：根据新仓库选择决定是否取消正在进行的请求
  const smartCancelRequests = (newRepos: string[]) => {
    const currentRepos = currentRequestRepos.current;

    console.log('🧠 智能请求管理:', {
      当前请求的仓库: currentRepos,
      新选择的仓库: newRepos,
      是否有交集: hasRepoIntersection(currentRepos, newRepos),
      是否有正在进行的请求: !!abortControllerRef.current,
    });

    // 如果没有正在进行的请求，直接返回
    if (!abortControllerRef.current) {
      console.log('✅ 没有正在进行的请求，无需处理');
      return;
    }

    // 如果新选择的仓库与正在请求的仓库有交集，保留请求
    if (hasRepoIntersection(currentRepos, newRepos)) {
      console.log('🔄 新选择的仓库与正在请求的仓库有交集，保留请求继续');
      return;
    }

    // 如果没有交集，取消当前请求
    console.log('🛑 新选择的仓库与正在请求的仓库无交集，取消当前请求');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    currentRequestRepos.current = [];

    // 清除防抖定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  };

  // 页面加载时同步URL参数到store，并检查是否需要自动查询
  useEffect(() => {
    console.log('🔥 页面 useEffect 被触发，开始处理URL参数和首次加载逻辑');

    const startParam = searchParams.get('startDate');
    const endParam = searchParams.get('endDate');
    const reposParam = searchParams.get('repos'); // 支持多仓库参数

    console.log('📋 URL参数解析:', {
      startParam,
      endParam,
      reposParam,
      searchParams: searchParams.toString(),
    });

    let initialStartDate = dayjs().startOf('month');
    let initialEndDate = dayjs();
    let initialRepos: string[] = [];

    // 处理日期参数
    if (startParam && endParam) {
      initialStartDate = dayjs(startParam);
      initialEndDate = dayjs(endParam);
      feedbackStore.filters.startDate = initialStartDate.toISOString();
      feedbackStore.filters.endDate = initialEndDate.toISOString();
      setDateRange([initialStartDate, initialEndDate]);
    } else {
      // 如果URL没有日期参数，使用默认值并更新store
      feedbackStore.filters.startDate = initialStartDate.toISOString();
      feedbackStore.filters.endDate = initialEndDate.toISOString();
    }

    // 处理仓库参数
    if (reposParam) {
      try {
        // 对URL编码的仓库参数进行解码
        const decodedReposParam = decodeURIComponent(reposParam);
        initialRepos = decodedReposParam.split(',').filter(Boolean); // 逗号分隔的仓库列表
        feedbackStore.filters.repos = initialRepos;
        setSelectedRepos(initialRepos);
        console.log('🔧 解码仓库参数:', {
          原始参数: reposParam,
          解码后: decodedReposParam,
          分割后: initialRepos,
        });
      } catch (error) {
        console.error('❌ 解码仓库参数失败:', error);
        // 如果解码失败，尝试直接分割
        initialRepos = reposParam.split(',').filter(Boolean);
        feedbackStore.filters.repos = initialRepos;
        setSelectedRepos(initialRepos);
      }
    } else {
      // 如果URL没有仓库参数，使用空数组（查询全部）
      feedbackStore.filters.repos = [];
    }

    console.log('🔧 初始化筛选条件:', {
      日期范围: [initialStartDate.format('YYYY-MM-DD'), initialEndDate.format('YYYY-MM-DD')],
      选择的仓库: initialRepos,
      store中的筛选条件: feedbackStore.filters,
    });

    // 首次加载逻辑：简化判断，确保首次访问时总是获取数据
    console.log('📊 当前状态检查:', {
      已经首次加载过: hasInitialLoadedRef.current,
      feedbackStore数据长度: feedbackStore.data?.length || 0,
      issueResponseTimes长度: feedbackStore.issueResponseTimes?.length || 0,
      PR数据长度: prStore.data?.rawData?.length || 0,
      loading状态: {
        feedback: feedbackStore.loading,
        issue: feedbackStore.issueAnalyticsLoading,
        pr: prStore.loading,
      },
    });

    // 首次加载：如果还没有首次加载过，就立即执行
    const needsInitialLoad = !hasInitialLoadedRef.current;

    console.log('🎯 首次加载判断:', {
      已经首次加载过: hasInitialLoadedRef.current,
      最终判断_需要首次加载: needsInitialLoad,
      首次加载策略: '简化逻辑，首次访问必定获取数据',
    });

    if (needsInitialLoad) {
      console.log('🚀 执行首次加载数据...');
      hasInitialLoadedRef.current = true; // 标记已经开始首次加载

      // 立即执行首次加载，不使用延迟
      handleInitialDataLoad(initialStartDate, initialEndDate, initialRepos);
    } else {
      console.log('✅ 首次加载已完成，跳过重复加载');
    }

    // 确保useEffect在所有情况下都有返回值
    return undefined;
  }, [searchParams]);

  // 监听store数据变化，用于调试
  useEffect(() => {
    console.log('📈 Store数据变化监听:', {
      反馈数据: feedbackStore.data?.length || 0,
      Issue数据: feedbackStore.issueResponseTimes?.length || 0,
      PR数据: prStore.data?.rawData?.length || 0,
      加载状态: {
        feedback: feedbackStore.loading,
        issue: feedbackStore.issueAnalyticsLoading,
        pr: prStore.loading,
      },
    });
  }, [
    feedbackStore.data?.length,
    feedbackStore.issueResponseTimes?.length,
    prStore.data?.rawData?.length,
    feedbackStore.loading,
    feedbackStore.issueAnalyticsLoading,
    prStore.loading,
  ]); // 添加依赖项以监听数据变化

  // 初次加载数据的专用函数
  const handleInitialDataLoad = async (startDate: Dayjs, endDate: Dayjs, repos: string[]) => {
    try {
      console.log('🎯🎯🎯 【重要】初次加载函数被调用！！！', {
        选择的仓库: repos,
        日期范围: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')],
        当前时间: new Date().toISOString(),
      });

      console.log('🎯 初次加载应用筛选条件:', {
        选择的仓库: repos,
        日期范围: [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')],
      });

      // 首次加载时清除所有缓存，确保获取最新数据
      console.log('🧹 首次加载：清除所有缓存数据');
      clearIssueDataCache();

      // 清除其他数据缓存
      feedbackStore.data = null;
      prStore.data = null;

      // 创建初次加载的AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // 确保store中的筛选条件正确
      feedbackStore.filters.startDate = startDate.toISOString();
      feedbackStore.filters.endDate = endDate.toISOString();
      feedbackStore.filters.repos = repos;

      // 计算 PR 筛选参数
      const prRepos = repos.length > 0 ? repos : ALL_PRODUCTS.map(product => product.value);

      // 记录当前正在请求的仓库
      currentRequestRepos.current = [...prRepos];

      console.log('🎯 初次加载计算出的PR仓库列表:', prRepos);
      console.log('📝 记录当前请求的仓库列表:', currentRequestRepos.current);

      // 检查网络连接
      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络后重试');
      }

      // 检查请求是否已被取消
      if (controller.signal.aborted) {
        console.log('⏭️ 初次加载请求已被取消，跳过执行');
        return;
      }

      // 并行触发三个服务的数据加载
      console.log('🔄 初次加载开始并行获取所有数据...');
      const results = await Promise.allSettled([
        fetchFeedbackDataWithCancel(controller.signal),
        fetchIssueResponseTimesWithCancel(controller.signal),
        fetchPRDataWithCancel({
          repos: prRepos,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
          signal: controller.signal,
        }),
      ]);

      // 检查请求是否在执行过程中被取消
      if (controller.signal.aborted) {
        console.log('⏭️ 初次加载请求在执行过程中被取消');
        return;
      }

      // 检查执行结果并记录日志
      const [feedbackResult, issueResult, prResult] = results;

      console.log('📊 初次加载数据获取结果:');
      console.log(
        '- 反馈数据:',
        feedbackResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${feedbackResult.reason}`
      );
      console.log(
        '- Issue数据:',
        issueResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${issueResult.reason}`
      );
      console.log(
        '- PR数据:',
        prResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${prResult.reason}`
      );

      console.log('✅ 初次加载所有数据获取完成');

      // 请求成功完成，清理controller和当前请求记录
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        currentRequestRepos.current = [];
        console.log('🧹 清理初次加载的请求控制器和仓库记录');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('⏭️ 初次加载请求被用户取消');
        currentRequestRepos.current = []; // 清理当前请求记录
      } else {
        console.error('❌ 初次加载查询数据失败:', error);
        // 请求失败也要清理
        currentRequestRepos.current = [];
      }
    }
  };

  // 更新URL参数 - 支持多仓库
  const updateUrlParams = (newStartDate: Dayjs, newEndDate: Dayjs, newRepos: string[]) => {
    const params = new URLSearchParams();
    params.set('startDate', newStartDate.format('YYYY-MM-DD'));
    params.set('endDate', newEndDate.format('YYYY-MM-DD'));
    if (newRepos.length > 0) {
      // 对仓库名称进行URL编码
      const encodedRepos = encodeURIComponent(newRepos.join(','));
      params.set('repos', encodedRepos);
      console.log('🔗 更新URL参数:', {
        仓库列表: newRepos,
        编码后: encodedRepos,
      });
    }

    // 使用replace避免创建新的历史记录条目
    router.replace(`/?${params.toString()}`);
  };

  // 处理仓库选择变化 - 重构为立即响应
  const handleRepoChange = async (values: string[]) => {
    console.log('🏁 页面: handleRepoChange被调用', {
      新值: values,
      当前值: selectedRepos,
      相同: JSON.stringify(values) === JSON.stringify(selectedRepos),
    });

    setSelectedRepos(values);
    updateUrlParams(dateRange[0], dateRange[1], values);

    // 更新store中的仓库选择 - 使用新值
    updateRepos(values);

    // 智能管理正在进行的请求 - 使用新值
    smartCancelRequests(values);

    // 立即开始新的查询 - 使用新值而不是状态
    console.log('🔄 仓库选择变化，立即开始查询数据...');
    await handleApplyFilterWithCancelForRepos(values);
  };

  // 专门为仓库变化创建的查询函数，直接使用传入的仓库值
  const handleApplyFilterWithCancelForRepos = async (repos: string[]) => {
    try {
      // 创建新的AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;

      console.log('🎯 应用筛选条件 (使用最新仓库值):', {
        选择的仓库: repos,
        日期范围: [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
      });

      // 更新 store 中的筛选条件 - 使用传入的仓库值
      feedbackStore.filters.startDate = dateRange[0].toISOString();
      feedbackStore.filters.endDate = dateRange[1].toISOString();
      feedbackStore.filters.repos = repos;

      // 更新URL参数 - 使用传入的仓库值
      updateUrlParams(dateRange[0], dateRange[1], repos);

      // 计算 PR 筛选参数 - 使用传入的仓库值
      const prRepos = repos.length > 0 ? repos : ALL_PRODUCTS.map(product => product.value);

      // 记录当前正在请求的仓库
      currentRequestRepos.current = [...prRepos];

      console.log('🎯 计算出的PR仓库列表:', prRepos);
      console.log('📝 记录当前请求的仓库列表:', currentRequestRepos.current);

      // 检查网络连接
      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络后重试');
      }

      // 检查请求是否已被取消
      if (controller.signal.aborted) {
        console.log('⏭️ 请求已被取消，跳过执行');
        return;
      }

      // 并行触发三个服务的数据加载（传递abort signal）
      console.log('🔄 开始并行获取所有数据 (支持取消)...');
      const results = await Promise.allSettled([
        fetchFeedbackDataWithCancel(controller.signal),
        fetchIssueResponseTimesWithCancel(controller.signal),
        fetchPRDataWithCancel({
          repos: prRepos,
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
          signal: controller.signal,
        }),
      ]);

      // 检查请求是否已被取消
      if (controller.signal.aborted) {
        console.log('⏭️ 请求在执行过程中被取消');
        return;
      }

      // 检查执行结果并记录日志
      const [feedbackResult, issueResult, prResult] = results;

      console.log('📊 数据获取结果:');
      console.log(
        '- 反馈数据:',
        feedbackResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${feedbackResult.reason}`
      );
      console.log(
        '- Issue数据:',
        issueResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${issueResult.reason}`
      );
      console.log(
        '- PR数据:',
        prResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${prResult.reason}`
      );

      console.log('✅ 所有数据获取完成（并行执行）');

      // 请求成功完成，清理controller和当前请求记录
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        currentRequestRepos.current = [];
        console.log('🧹 清理请求控制器和仓库记录');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('⏭️ 请求被用户取消');
        currentRequestRepos.current = []; // 清理当前请求记录
      } else {
        console.error('❌ 查询数据失败:', error);
        // 请求失败也要清理
        currentRequestRepos.current = [];
      }
    }
  };

  // 处理日期变化 - 添加自动查询和智能请求管理
  const handleDateRangeChange = async (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      const newDateRange: [Dayjs, Dayjs] = [dates[0], dates[1]];
      setDateRange(newDateRange);
      updateUrlParams(newDateRange[0], newDateRange[1], selectedRepos);

      // 更新store
      updateDateRange(newDateRange[0].toISOString(), newDateRange[1].toISOString());

      // 日期变化不影响仓库筛选，但需要重新查询，所以智能管理请求
      smartCancelRequests(selectedRepos);

      // 自动触发查询
      console.log('🔄 日期范围变化，自动查询数据...');
      await handleApplyFilterWithCancel();
    }
  };

  // 支持请求取消的查询函数
  const handleApplyFilterWithCancel = async () => {
    try {
      // 创建新的AbortController
      const controller = new AbortController();
      abortControllerRef.current = controller;

      console.log('🎯 应用筛选条件 (支持取消):', {
        选择的仓库: selectedRepos,
        日期范围: [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')],
      });

      // 更新 store 中的筛选条件
      feedbackStore.filters.startDate = dateRange[0].toISOString();
      feedbackStore.filters.endDate = dateRange[1].toISOString();
      feedbackStore.filters.repos = selectedRepos;

      // 更新URL参数
      updateUrlParams(dateRange[0], dateRange[1], selectedRepos);

      // 计算 PR 筛选参数
      const prRepos =
        selectedRepos.length > 0 ? selectedRepos : ALL_PRODUCTS.map(product => product.value);

      // 记录当前正在请求的仓库
      currentRequestRepos.current = [...prRepos];

      console.log('🎯 计算出的PR仓库列表:', prRepos);
      console.log('📝 记录当前请求的仓库列表:', currentRequestRepos.current);

      // 检查网络连接
      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络后重试');
      }

      // 检查请求是否已被取消
      if (controller.signal.aborted) {
        console.log('⏭️ 请求已被取消，跳过执行');
        return;
      }

      // 并行触发三个服务的数据加载（传递abort signal）
      console.log('🔄 开始并行获取所有数据 (支持取消)...');
      const results = await Promise.allSettled([
        fetchFeedbackDataWithCancel(controller.signal),
        fetchIssueResponseTimesWithCancel(controller.signal),
        fetchPRDataWithCancel({
          repos: prRepos,
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
          signal: controller.signal,
        }),
      ]);

      // 检查请求是否已被取消
      if (controller.signal.aborted) {
        console.log('⏭️ 请求在执行过程中被取消');
        return;
      }

      // 检查执行结果并记录日志
      const [feedbackResult, issueResult, prResult] = results;

      console.log('📊 数据获取结果:');
      console.log(
        '- 反馈数据:',
        feedbackResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${feedbackResult.reason}`
      );
      console.log(
        '- Issue数据:',
        issueResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${issueResult.reason}`
      );
      console.log(
        '- PR数据:',
        prResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${prResult.reason}`
      );

      console.log('✅ 所有数据获取完成（并行执行）');

      // 请求成功完成，清理controller和当前请求记录
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        currentRequestRepos.current = [];
        console.log('🧹 清理请求控制器和仓库记录');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('⏭️ 请求被用户取消');
        currentRequestRepos.current = []; // 清理当前请求记录
      } else {
        console.error('❌ 查询数据失败:', error);
        // 请求失败也要清理
        currentRequestRepos.current = [];
      }
    }
  };

  // 格式化日期范围显示
  const formatDateRange = () => {
    return `${dateRange[0].format('YYYY-MM-DD')} 至 ${dateRange[1].format('YYYY-MM-DD')}`;
  };

  // 快捷日期选择 - 带自动查询
  const handleQuickDateSelect = async (days: number) => {
    const endDate = dayjs();
    const startDate = endDate.subtract(days, 'day');
    const newDateRange: [Dayjs, Dayjs] = [startDate, endDate];

    setDateRange(newDateRange);
    updateUrlParams(startDate, endDate, selectedRepos);

    // 更新store筛选条件
    updateDateRange(startDate.toISOString(), endDate.toISOString());

    // 确定PR查询的仓库列表
    const prRepos = selectedRepos.length > 0 ? selectedRepos : ALL_PRODUCTS.map(p => p.value);

    try {
      setError(null);

      // 检查网络连接
      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络后重试');
      }

      // 并行触发三个服务的数据加载
      console.log('🔄 开始并行获取所有数据...');
      const results = await Promise.allSettled([
        fetchFeedbackData(),
        fetchIssueResponseTimes(),
        fetchPRData({
          repos: prRepos,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
        }),
      ]);

      // 检查执行结果并记录日志
      const [feedbackResult, issueResult, prResult] = results;

      console.log('📊 快捷日期数据获取结果:');
      console.log(
        '- 反馈数据:',
        feedbackResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${feedbackResult.reason}`
      );
      console.log(
        '- Issue数据:',
        issueResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${issueResult.reason}`
      );
      console.log(
        '- PR数据:',
        prResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${prResult.reason}`
      );

      console.log('✅ 所有数据获取完成（并行执行）');
    } catch (error) {
      console.error('❌ 快捷日期选择数据获取失败:', error);
      // 错误会由各个store自行处理和显示
    }
  };

  // 快捷选择2025下半年 (7月1日 - 12月31日)
  const handleSecondHalfYear = async () => {
    const startDate = dayjs('2025-07-01');
    const endDate = dayjs('2025-12-31');
    const newDateRange: [Dayjs, Dayjs] = [startDate, endDate];

    setDateRange(newDateRange);
    updateUrlParams(startDate, endDate, selectedRepos);

    // 更新store筛选条件
    updateDateRange(startDate.toISOString(), endDate.toISOString());

    // 更新store筛选条件
    updateDateRange(startDate.toISOString(), endDate.toISOString());

    // 确定PR查询的仓库列表
    const prRepos = selectedRepos.length > 0 ? selectedRepos : ALL_PRODUCTS.map(p => p.value);

    try {
      setError(null);

      // 检查网络连接
      if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络后重试');
      }

      // 并行触发三个服务的数据加载
      console.log('🔄 开始并行获取下半年数据...');
      const results = await Promise.allSettled([
        fetchFeedbackData(),
        fetchIssueResponseTimes(),
        fetchPRData({
          repos: prRepos,
          startDate: startDate.format('YYYY-MM-DD'),
          endDate: endDate.format('YYYY-MM-DD'),
        }),
      ]);

      // 检查执行结果并记录日志
      const [feedbackResult, issueResult, prResult] = results;

      console.log('📊 下半年数据获取结果:');
      console.log(
        '- 反馈数据:',
        feedbackResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${feedbackResult.reason}`
      );
      console.log(
        '- Issue数据:',
        issueResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${issueResult.reason}`
      );
      console.log(
        '- PR数据:',
        prResult.status === 'fulfilled' ? '✅ 成功' : `❌ 失败: ${prResult.reason}`
      );

      console.log('✅ 下半年所有数据获取完成');
    } catch (error) {
      console.error('❌ 获取下半年数据失败:', error);
      // 错误会由各个store自行处理和显示
    }
  };

  // 清除缓存并重新获取数据
  const handleClearCacheAndRefresh = async () => {
    try {
      setError(null);

      // 清除Issue数据缓存
      clearIssueDataCache();

      // 重新获取所有数据
      await handleApplyFilterWithCancel();

      console.log('✅ 缓存已清除，数据已重新获取');
    } catch (error) {
      console.error('❌ 清除缓存并刷新数据失败:', error);
      setError('清除缓存失败，请重试');
    }
  };

  return (
    <>
      <div
        className="min-h-screen text-slate-700 font-['Inter',system-ui,sans-serif]"
        style={{
          // background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          background:
            "url('https://mass-office.alipay.com/huamei_koqzbu/afts/img/kiZORZ0SvXkAAAAAAAAAABAADnV5AQBr/original') center center / cover no-repeat",
          minWidth: '1200px',
          overflowX: 'auto',
        }}
      >
        {/* 整体布局容器 */}
        <div className="py-4 px-4 md:px-6 max-w-7xl mx-auto fade-in">
          {/* 大容器卡片 */}
          <Card
            className="rounded-xl border border-slate-200 shadow-lg overflow-hidden mb-4"
            bodyStyle={{ padding: '16px' }}
            style={{ backgroundColor: '#ffffff' }}
          >
            {/* 页面标题和导航区域 */}
            <div className="mb-4">
              <div className="flex flex-col md:flex-row items-center justify-between mb-3 gap-3">
                <div className="flex items-center">
                  <div
                    className="bg-slate-100 p-2 rounded-lg mr-3 shadow-sm pulse-animation"
                    style={{ animationDuration: '3s' }}
                  >
                    <LineChartOutlined className="text-lg text-slate-600" />
                  </div>
                  <div>
                    <Title level={4} className="mb-0 mt-0 font-bold text-slate-800">
                      AntV 社区数据看板
                    </Title>
                    <Text type="secondary" className="text-xs text-slate-500">
                      统计范围：{formatDateRange()}
                    </Text>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    icon={<UserOutlined />}
                    className="rounded-lg shadow-sm transition-all duration-300 border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-700"
                    size="small"
                    onClick={() => (window.location.href = '/contributors')}
                  >
                    贡献者统计
                  </Button>
                  <Button
                    type="primary"
                    icon={<TeamOutlined />}
                    className="rounded-lg shadow-sm transition-all duration-300 border-0 bg-slate-700 hover:bg-slate-800"
                    size="small"
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

            <Divider className="my-4 border-slate-200" />

            {/* 筛选器 */}
            <div className="mb-4">
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1">
                  <div className="text-xs text-slate-600 mb-1">日期范围</div>
                  <Space direction="vertical" size="small" className="w-full">
                    <div className="flex items-center space-x-2">
                      <RangePicker
                        value={dateRange}
                        onChange={handleDateRangeChange}
                        size="small"
                        className="flex-1"
                      />
                      <Button
                        size="small"
                        type="text"
                        onClick={() => handleQuickDateSelect(14)}
                        className="text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                      >
                        近两周
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        onClick={() => handleQuickDateSelect(30)}
                        className="text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                      >
                        近一个月
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        onClick={handleSecondHalfYear}
                        className="text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                      >
                        2025下半年
                      </Button>
                    </div>
                  </Space>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-slate-600 mb-1">选择仓库</div>
                  <div className="w-full">
                    <TechStackFilter value={selectedRepos} onChange={handleRepoChange} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="small"
                    type="text"
                    onClick={handleClearCacheAndRefresh}
                    className="text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                    title="清除缓存并重新获取所有数据"
                  >
                    🧹 刷新缓存
                  </Button>
                </div>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-3">
                <Alert
                  description={error}
                  type="info"
                  showIcon
                  className="rounded-xl border-slate-200 bg-slate-50 shadow-sm animate-fadeIn"
                />
              </div>
            )}

            <Divider className="my-4 border-slate-200" />

            {/* 社区数据大盘 */}
            <CommunityDashboard />
          </Card>

          <footer className="mt-4 mb-4 text-center text-slate-500 text-xs">
            <Divider className="opacity-50 border-slate-300" />
            <div className="flex items-center justify-center gap-1">
              <span>AntV 社区数据看板</span>
              <span className="inline-block mx-1.5 h-1 w-1 rounded-full bg-slate-300"></span>
              <span>有疑问请联系 @半璇</span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <HomeContent />
    </Suspense>
  );
}
