/**
 * GitHub Issues 分析工具函数
 * 所有分析逻辑都在前端完成，避免API超时
 */

// AntV 团队成员缓存
const antVMemberCache = new Map<string, boolean>();

/**
 * 检查用户是否是 AntV 组织成员
 */
export async function isAntVMember(username: string): Promise<boolean> {
  if (antVMemberCache.has(username)) {
    return antVMemberCache.get(username)!;
  }

  try {
    // 调用后端API检查成员关系（使用认证的GitHub token）
    const response = await fetch('/api/check-member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      console.error(`检查成员失败: ${username}, status: ${response.status}`);
      return false;
    }

    const data = await response.json();
    const isMember = data.isMember || false;
    antVMemberCache.set(username, isMember);
    return isMember;
  } catch (error) {
    console.error(`检查成员失败: ${username}`, error);
    return false;
  }
}

/**
 * 分析单个issue的响应时间（完整逻辑）
 */
export async function analyzeIssueResponseTime(
  issue: any,
  details?: { comments: any[]; timeline: any[] }
) {
  const issueCreatedAt = new Date(issue.created_at);
  const issueCreator = issue.user;

  let firstResponseTime: Date | null = null;
  let hasResponse = false;
  let responseTimeInHours: number | null = null;
  let responseSource: 'comment' | 'timeline' | 'closed' | 'maintainer' | null = null;

  // 检查创建者是否是maintainer，如果是则视为已响应且响应时长为0
  const isMaintainer = await isAntVMember(issueCreator);
  if (isMaintainer) {
    return {
      number: issue.number,
      title: issue.title,
      created_at: issue.created_at,
      closed_at: issue.closed_at,
      state: issue.state,
      html_url: issue.html_url,
      user: issue.user,
      labels: issue.labels,
      hasResponse: true,
      responseTimeInHours: 0,
      meetsSLA: true,
      responseSource: 'maintainer',
      repo: issue.repo,
    };
  }

  // 如果没有传入详细信息，使用简化逻辑
  if (!details) {
    if (issue.state === 'closed' && issue.closed_at) {
      hasResponse = true;
      firstResponseTime = new Date(issue.closed_at);
      responseSource = 'closed';
    } else {
      hasResponse = false;
      const currentTime = new Date();
      const timeDiff = currentTime.getTime() - issueCreatedAt.getTime();
      responseTimeInHours = Math.round((timeDiff / (1000 * 60 * 60)) * 10) / 10;
    }
  } else {
    // 完整逻辑：检查评论和时间线

    // 1. 检查评论中的第一条有效响应
    let firstCommentTime: Date | null = null;
    if (details.comments && details.comments.length > 0) {
      const firstValidComment = details.comments.find(
        comment => comment.user !== issueCreator && comment.userType !== 'Bot'
      );

      if (firstValidComment) {
        firstCommentTime = new Date(firstValidComment.created_at);
      }
    }

    // 2. 检查时间线中的标签事件（团队成员添加标签，排除bot）
    let firstLabelTime: Date | null = null;
    if (details.timeline && details.timeline.length > 0) {
      for (const event of details.timeline) {
        if (event.event === 'labeled' && event.actor) {
          // 排除创建者自己和bot的操作
          if (event.actor !== issueCreator && event.actorType !== 'Bot') {
            const eventTime = new Date(event.created_at);
            if (!firstLabelTime || eventTime < firstLabelTime) {
              firstLabelTime = eventTime;
            }
          }
        }
      }
    }

    // 3. 检查时间线中的PR引用（排除bot）
    let firstPRReferenceTime: Date | null = null;
    if (details.timeline && details.timeline.length > 0) {
      for (const event of details.timeline) {
        if (event.event === 'cross-referenced' && event.source) {
          // 排除bot的操作
          if (!event.actor || event.actorType !== 'Bot') {
            const eventTime = new Date(event.created_at);
            if (!firstPRReferenceTime || eventTime < firstPRReferenceTime) {
              firstPRReferenceTime = eventTime;
            }
          }
        }
      }
    }

    // 4. 找出最早的响应时间
    const responseTimes = [
      { time: firstCommentTime, source: 'comment' as const },
      { time: firstLabelTime, source: 'timeline' as const },
      { time: firstPRReferenceTime, source: 'timeline' as const },
    ].filter(item => item.time !== null);

    if (responseTimes.length > 0) {
      // 按时间排序，找出最早的
      responseTimes.sort((a, b) => a.time!.getTime() - b.time!.getTime());
      firstResponseTime = responseTimes[0].time;
      responseSource = responseTimes[0].source;
      hasResponse = true;
    } else if (issue.state === 'closed' && issue.closed_at) {
      // 如果没有明确响应，但已关闭，算作关闭时响应
      firstResponseTime = new Date(issue.closed_at);
      responseSource = 'closed';
      hasResponse = true;
    } else {
      // 未响应
      hasResponse = false;
      const currentTime = new Date();
      const timeDiff = currentTime.getTime() - issueCreatedAt.getTime();
      responseTimeInHours = Math.round((timeDiff / (1000 * 60 * 60)) * 10) / 10;
    }
  }

  // 计算响应时间（小时）
  if (firstResponseTime && hasResponse) {
    const timeDiff = firstResponseTime.getTime() - issueCreatedAt.getTime();
    responseTimeInHours = Math.round((timeDiff / (1000 * 60 * 60)) * 10) / 10;
  }

  // 确保响应时间不为负数
  if (responseTimeInHours !== null && responseTimeInHours < 0) {
    responseTimeInHours = 0;
  }

  // 计算是否符合48小时SLA
  const meetsSLA = hasResponse && responseTimeInHours !== null && responseTimeInHours <= 48;

  return {
    number: issue.number,
    title: issue.title,
    created_at: issue.created_at,
    closed_at: issue.closed_at,
    state: issue.state,
    html_url: issue.html_url,
    user: issue.user,
    labels: issue.labels,
    hasResponse,
    responseTimeInHours,
    meetsSLA,
    responseSource,
    repo: issue.repo,
  };
}

/**
 * 批量分析issues（逐个获取详细信息）
 */
export async function analyzeIssuesWithDetails(
  issues: any[],
  onProgress?: (current: number, total: number) => void
) {
  const results = [];

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];

    try {
      // 只有当issue有评论时才获取详情
      let details = undefined;
      if (issue.comments > 0) {
        const detailsResponse = await fetch('/api/github-issues/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repo: issue.repo,
            issueNumber: issue.number,
          }),
        });

        if (detailsResponse.ok) {
          details = await detailsResponse.json();
        }
      }

      const analyzed = await analyzeIssueResponseTime(issue, details);
      results.push(analyzed);

      if (onProgress) {
        onProgress(i + 1, issues.length);
      }

      // 避免API限流，每个请求后稍微延迟
      if (details) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`分析issue #${issue.number}失败:`, error);
      // 出错时使用简化分析
      const analyzed = await analyzeIssueResponseTime(issue);
      results.push(analyzed);
    }
  }

  return results;
}

/**
 * 计算汇总指标
 */
export function calculateMetrics(analyzedIssues: any[]) {
  const totalIssues = analyzedIssues.length;
  const respondedIssues = analyzedIssues.filter(i => i.hasResponse).length;
  const withinSLA = analyzedIssues.filter(i => i.meetsSLA).length;

  const responseTimes = analyzedIssues
    .filter(i => i.hasResponse && i.responseTimeInHours !== null)
    .map(i => i.responseTimeInHours!);

  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
      : null;

  const medianResponseTime =
    responseTimes.length > 0
      ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
      : null;

  return {
    totalIssues,
    respondedIssues,
    responseRate: totalIssues > 0 ? Math.round((respondedIssues / totalIssues) * 100) : 0,
    withinSLA,
    slaRate: totalIssues > 0 ? Math.round((withinSLA / totalIssues) * 100) : 0,
    avgResponseTime,
    medianResponseTime,
  };
}
