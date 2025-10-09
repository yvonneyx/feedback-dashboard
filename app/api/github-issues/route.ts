import { Octokit } from '@octokit/rest';
import { NextResponse } from 'next/server';

// 直接设置API超时常量，避免使用getConfig
const API_TIMEOUT = 60000; // 将默认超时时间减少到60秒

// 配置GitHub API客户端，增加重试和超时配置
const octokit = new Octokit({
  auth: process.env.PERSONAL_GITHUB_TOKEN,
  request: {
    timeout: API_TIMEOUT, // 设置请求超时时间
  },
});

// 设置 API 路由配置
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
    externalResolver: true,
  },
  runtime: 'nodejs',
  maxDuration: 180, // 将最大执行时间减少到180秒(3分钟)
};

export async function POST(request: Request) {
  try {
    const { startDate, endDate, repo } = await request.json();

    if (!repo) {
      return NextResponse.json({ error: '仓库参数是必须的' }, { status: 400 });
    }

    // 解析repo参数 (例如: 'antvis/g2')
    const [owner, repoName] = repo.split('/');

    // 添加延迟，以避免GitHub API限制
    console.log(`获取 ${repo} 的issues数据`);

    // 查询仓库中的issues
    const issues = await fetchAllIssues(owner, repoName, startDate, endDate, 50);

    // 分析每个issue的响应时间
    const analyzedIssues = await analyzeIssueResponseTimes(issues, owner, repoName);

    // 为每个issue添加仓库信息
    const issuesWithRepo = analyzedIssues.map(issue => ({
      ...issue,
      repo: repo, // 添加仓库信息
    }));

    return NextResponse.json(issuesWithRepo);
  } catch (error) {
    console.error('获取GitHub issues失败:', error);
    return NextResponse.json({ error: '获取GitHub数据时出错' }, { status: 500 });
  }
}

// 获取符合条件的所有issues - 使用search API获取精确日期范围内的issues
async function fetchAllIssues(
  owner: string,
  repo: string,
  startDate: string,
  endDate: string,
  perPage: number = 100
) {
  const issues = [];
  let page = 1;
  let hasMorePages = true;

  // 计算开始时间
  const startDateTime = new Date(startDate);

  // 计算结束时间 - 将结束日期设为下一天的00:00:00，确保包含整个结束日期
  const endDateTime = new Date(endDate);
  endDateTime.setDate(endDateTime.getDate() + 1);

  // 格式化日期为GitHub搜索语法要求的格式
  const formattedStartDate = startDateTime.toISOString();
  const formattedEndDate = endDateTime.toISOString();

  // 构建搜索查询
  // 查找指定仓库中，在指定日期范围内创建的，且不是PR的issues
  const query = `repo:${owner}/${repo} is:issue created:${formattedStartDate}..${formattedEndDate}`;

  console.log(`执行查询: ${query}`);

  // 使用分页获取所有符合条件的issues
  while (hasMorePages) {
    try {
      const searchResponse = await fetchWithRetry(() =>
        octokit.search.issuesAndPullRequests({
          q: query,
          per_page: perPage, // 使用传入的perPage参数
          page,
          sort: 'created',
          order: 'desc',
        })
      );

      if (searchResponse.data.items.length > 0) {
        issues.push(...searchResponse.data.items);
      }

      // 检查是否还有更多页面
      hasMorePages =
        searchResponse.data.items.length === perPage &&
        page * perPage < searchResponse.data.total_count;

      console.log(
        `第${page}页获取到${searchResponse.data.items.length}个issues，总计: ${searchResponse.data.total_count}`
      );
      page++;
    } catch (error) {
      console.error(`获取第${page}页issues失败:`, error);
      hasMorePages = false; // 发生错误时停止分页
    }
  }

  console.log(`总共获取了${issues.length}个issues (${formattedStartDate} - ${formattedEndDate})`);
  return issues;
}

// 重试函数，当请求失败时重试
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  maxRetries = 3,
  delay = 2000
): Promise<T> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      return await fetchFn();
    } catch (error: any) {
      retries++;

      // 如果是最后一次尝试失败，直接抛出错误
      if (retries === maxRetries) {
        throw error;
      }

      // 如果是速率限制错误，延迟更长时间
      if (error?.status === 403 && error?.headers?.['x-ratelimit-remaining'] === '0') {
        const resetTime = error?.headers?.['x-ratelimit-reset']
          ? parseInt(error.headers['x-ratelimit-reset']) * 1000
          : Date.now() + 60000;

        const waitTime = Math.max(resetTime - Date.now(), 10000);
        console.log(`GitHub API 速率限制，等待 ${waitTime / 1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        // 常规错误，使用指数退避策略
        const waitTime = delay * Math.pow(2, retries - 1);
        console.log(`请求失败，${waitTime / 1000} 秒后重试(${retries}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // 这一行代码实际上不会被执行到，因为要么成功返回，要么抛出异常
  // 但需要添加以满足TypeScript类型检查
  throw new Error('所有重试失败');
}

// 检查用户是否是AntV成员的函数，添加缓存以减少API调用
const membershipCache = new Map<string, boolean>();

async function isAntVMember(username: string): Promise<boolean> {
  // 检查缓存
  if (membershipCache.has(username)) {
    return membershipCache.get(username)!;
  }

  try {
    // 检查用户是否是antvis组织的成员
    await octokit.orgs.checkMembershipForUser({
      org: 'antvis',
      username: username,
    });
    membershipCache.set(username, true);
    return true; // 如果没有抛出异常，说明是成员
  } catch (error: any) {
    // 如果返回404，用户不是成员或成员身份不公开
    if (error.status === 404) {
      membershipCache.set(username, false);
      return false;
    }
    // 其他错误，保守起见认为不是成员
    console.warn(`检查用户 ${username} 的AntV成员身份时出错:`, error.message);
    membershipCache.set(username, false);
    return false;
  }
}

// 分析issues的首次响应时间 - 调整处理Search API返回的数据
async function analyzeIssueResponseTimes(issues: any[], owner: string, repo: string) {
  const analyzedIssues = [];

  for (const issue of issues) {
    // 从Search API返回的URL中提取issue number
    const issueNumber = issue.number;

    // 默认值
    let firstResponseTime = null;
    let hasResponse = false;
    let responseTimeInHours = null;

    try {
      // 获取issue的timeline事件，用于分析标签添加
      const timelineResponse = await fetchWithRetry(() =>
        octokit.issues.listEventsForTimeline({
          owner,
          repo,
          issue_number: issueNumber,
        })
      );

      // 获取issue的评论，用于分析回复
      const commentsResponse = await fetchWithRetry(() =>
        octokit.issues.listComments({
          owner,
          repo,
          issue_number: issueNumber,
        })
      );

      const issueCreatedAt = new Date(issue.created_at);
      const issueCreator = issue.user.login;

      // 检查评论中的首次AntV成员回复
      let firstMaintainerComment = null;
      
      // 筛选非机器人和非issue创建者的评论
      const candidateComments = commentsResponse.data
        .filter(
          (comment: any) => comment.user?.login !== issueCreator && comment.user?.type !== 'Bot'
        )
        .sort(
          (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

      // 检查每个评论者是否是AntV成员
      for (const comment of candidateComments) {
        if (comment.user?.login) {
          const isAntVMemberResult = await isAntVMember(comment.user.login);
          if (isAntVMemberResult) {
            firstMaintainerComment = comment;
            console.log(`✅ 发现AntV成员 ${comment.user.login} 的回复作为首次响应`);
            break; // 找到第一个AntV成员的回复就停止
          }
        }
      }

      // 如果没有找到AntV成员的回复，使用第一个非创建者、非机器人的回复作为备用
      if (!firstMaintainerComment && candidateComments.length > 0) {
        firstMaintainerComment = candidateComments[0];
        console.log(`⚠️ 未找到AntV成员回复，使用第一个维护者回复: ${firstMaintainerComment.user?.login}`);
      }

      // 检查timeline中的首次AntV成员标签添加事件
      let firstLabelEvent = null;
      
      // 筛选标签添加事件
      const candidateLabelEvents = timelineResponse.data
        .filter((event: any) => {
          // 过滤标签添加事件
          if (event.event !== 'labeled') return false;
          // 排除issue创建者自己添加的标签
          if (event.actor && event.actor.login === issueCreator) return false;
          // 排除机器人添加的标签
          if (event.actor && event.actor.type === 'Bot') return false;
          return true;
        })
        .sort(
          (a: any, b: any) => new Date(a?.created_at).getTime() - new Date(b?.created_at).getTime()
        );

      // 检查每个标签事件的操作者是否是AntV成员
      for (const event of candidateLabelEvents) {
        // @ts-expect-error type error
        if (event.actor?.login) {
          // @ts-expect-error type error
          const isAntVMemberResult = await isAntVMember(event.actor.login);
          if (isAntVMemberResult) {
            firstLabelEvent = event;
            // @ts-expect-error type error
            console.log(`✅ 发现AntV成员 ${event.actor.login} 添加标签作为首次响应`);
            break; // 找到第一个AntV成员的标签操作就停止
          }
        }
      }

      // 如果没有找到AntV成员的标签操作，使用第一个符合条件的标签事件作为备用
      if (!firstLabelEvent && candidateLabelEvents.length > 0) {
        firstLabelEvent = candidateLabelEvents[0];
        // @ts-expect-error type error
        console.log(`⚠️ 未找到AntV成员标签操作，使用第一个维护者标签: ${firstLabelEvent.actor?.login}`);
      }

      // 检查timeline中的首次PR关联事件
      const firstPrReferenceEvent = timelineResponse.data
        .filter((event: any) => {
          // cross-referenced 且来源是 PR
          if (event.event !== 'cross-referenced') return false;
          if (!event.source || !event.source.issue) return false;
          if (!event.source.issue.pull_request) return false;
          // 排除自己引用自己
          if (event.source.issue.number === issueNumber) return false;
          // 排除机器人
          if (event.actor && event.actor.type === 'Bot') return false;
          return true;
        })
        .sort(
          (a: any, b: any) =>
            new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime()
        )[0];

      // 确定哪个事件先发生 - 评论、标签、PR 关联
      const responseSources: { type: string; time: Date }[] = [];
      if (firstMaintainerComment)
        responseSources.push({ type: '评论', time: new Date(firstMaintainerComment.created_at) });
      if (firstLabelEvent)
        // @ts-expect-error type error
        responseSources.push({ type: '标签', time: new Date(firstLabelEvent.created_at) });
      // @ts-expect-error type error
      if (firstPrReferenceEvent && firstPrReferenceEvent.created_at)
        // @ts-expect-error type error
        responseSources.push({ type: 'PR关联', time: new Date(firstPrReferenceEvent.created_at) });

      // 统一的响应时间计算逻辑
      if (responseSources.length > 0) {
        // 情况1: 有实际响应（label或非bot回复）
        hasResponse = true;
        responseSources.sort((a, b) => a.time.getTime() - b.time.getTime());
        firstResponseTime = responseSources[0].time;
        const responseType = responseSources[0].type;
        console.log(`✅ Issue #${issueNumber}: 首次响应为${responseType}`);
        const timeDiff = firstResponseTime.getTime() - issueCreatedAt.getTime();
        responseTimeInHours = Math.round((timeDiff / (1000 * 60 * 60)) * 10) / 10;
      } else if (issue.state === 'closed' && issue.closed_at) {
        // 情况2: 没有实际响应但被关闭，视为响应了
        hasResponse = true;
        firstResponseTime = new Date(issue.closed_at);
        const timeDiff = firstResponseTime.getTime() - issueCreatedAt.getTime();
        responseTimeInHours = Math.round((timeDiff / (1000 * 60 * 60)) * 10) / 10;
        console.log(`✅ Issue #${issueNumber}: 无实际响应但已关闭，使用关闭时间作为响应时间`);
      } else {
        // 情况3: 一直open且没响应，统计到当前时间
        hasResponse = false;
        const currentTime = new Date();
        const timeDiff = currentTime.getTime() - issueCreatedAt.getTime();
        responseTimeInHours = Math.round((timeDiff / (1000 * 60 * 60)) * 10) / 10;
        console.log(
          `⚠️ Issue #${issueNumber}: open状态且未响应，统计到当前时间: ${responseTimeInHours}小时`
        );
      }

      // 确保响应时间不为负数
      if (responseTimeInHours !== null && responseTimeInHours < 0) {
        console.warn(
          `⚠️ Issue #${issueNumber} 响应时间为负数: ${responseTimeInHours}小时，设置为0`
        );
        responseTimeInHours = 0;
      }

      // 计算是否符合48小时SLA
      const meetsSLA = hasResponse && responseTimeInHours !== null && responseTimeInHours <= 48;

      if (meetsSLA) {
        console.log(`✅ Issue #${issueNumber}: 符合48h SLA, 响应时间=${responseTimeInHours}小时`);
      }

      analyzedIssues.push({
        number: issueNumber,
        title: issue.title,
        created_at: issue.created_at,
        closed_at: issue.closed_at, // 添加关闭时间信息
        state: issue.state,
        html_url: issue.html_url,
        hasResponse,
        responseTimeInHours,
        meetsSLA: meetsSLA, // 确保明确设置
      });
    } catch (error) {
      console.error(`分析issue #${issueNumber}响应时间出错:`, error);
      // 即使出错也添加到结果中，使用统一的响应时间计算逻辑
      const issueCreatedAt = new Date(issue.created_at);
      let hasResponseError = false;
      let timeToQuery = 0;

      // 统一的响应时间计算逻辑（与正常流程一致）
      if (issue.state === 'closed' && issue.closed_at) {
        // 被关闭的issue视为已响应，使用关闭时间
        hasResponseError = true;
        const endTime = new Date(issue.closed_at);
        const timeDiff = endTime.getTime() - issueCreatedAt.getTime();
        timeToQuery = Math.round((timeDiff / (1000 * 60 * 60)) * 10) / 10;
      } else {
        // open状态的issue，出错时标记为未响应，使用当前时间计算
        hasResponseError = false;
        const currentTime = new Date();
        const timeDiff = currentTime.getTime() - issueCreatedAt.getTime();
        timeToQuery = Math.round((timeDiff / (1000 * 60 * 60)) * 10) / 10;
      }

      analyzedIssues.push({
        number: issueNumber,
        title: issue.title,
        created_at: issue.created_at,
        closed_at: issue.closed_at, // 添加关闭时间信息
        state: issue.state,
        html_url: issue.html_url,
        hasResponse: hasResponseError,
        responseTimeInHours: timeToQuery,
        meetsSLA: hasResponseError && timeToQuery <= 48,
        error: '分析此issue时发生错误',
      });
    }
  }

  return analyzedIssues;
}
