import { Octokit } from '@octokit/rest';
import { NextResponse } from 'next/server';

// 配置GitHub API客户端
const octokit = new Octokit({
  auth: process.env.PERSONAL_GITHUB_TOKEN,
});

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
    const issues = await fetchAllIssues(owner, repoName, startDate, endDate);

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
async function fetchAllIssues(owner: string, repo: string, startDate: string, endDate: string) {
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
      const searchResponse = await octokit.search.issuesAndPullRequests({
        q: query,
        per_page: 100,
        page,
        sort: 'created',
        order: 'desc',
      });

      if (searchResponse.data.items.length > 0) {
        issues.push(...searchResponse.data.items);
      }

      // 检查是否还有更多页面
      hasMorePages =
        searchResponse.data.items.length === 100 && page * 100 < searchResponse.data.total_count;

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
      const timelineResponse = await octokit.issues.listEventsForTimeline({
        owner,
        repo,
        issue_number: issueNumber,
      });

      // 获取issue的评论，用于分析回复
      const commentsResponse = await octokit.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber,
      });

      const issueCreatedAt = new Date(issue.created_at);
      const issueCreator = issue.user.login;

      // 检查评论中的首次维护者回复
      const firstMaintainerComment = commentsResponse.data
        .filter(comment => comment.user?.login !== issueCreator && comment.user?.type !== 'Bot')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

      // 检查timeline中的首次标签添加事件
      const firstLabelEvent = timelineResponse.data
        .filter(
          (event: any) =>
            event.event === 'labeled' &&
            ((event.actor && event.actor?.login !== issueCreator && event.actor?.type !== 'Bot') ||
              event.label?.name === 'OSCP')
        )
        .sort(
          (a: any, b: any) => new Date(a?.created_at).getTime() - new Date(b?.created_at).getTime()
        )[0];

      // 确定哪个事件先发生 - 评论或标签添加
      if (firstMaintainerComment || firstLabelEvent) {
        hasResponse = true;

        const commentTime = firstMaintainerComment
          ? new Date(firstMaintainerComment.created_at)
          : null;
        const labelTime = firstLabelEvent ? new Date((firstLabelEvent as any).created_at) : null;

        // 比较哪个响应先发生
        if (commentTime && labelTime) {
          firstResponseTime = commentTime < labelTime ? commentTime : labelTime;
        } else {
          firstResponseTime = commentTime || labelTime;
        }

        // 计算响应时间（小时）
        if (firstResponseTime) {
          const timeDiff = firstResponseTime.getTime() - issueCreatedAt.getTime();
          responseTimeInHours = Math.round((timeDiff / (1000 * 60 * 60)) * 10) / 10; // 保留一位小数
        }
      }

      analyzedIssues.push({
        number: issueNumber,
        title: issue.title,
        created_at: issue.created_at,
        state: issue.state,
        html_url: issue.html_url,
        hasResponse,
        responseTimeInHours,
        meetsSLA: responseTimeInHours !== null && responseTimeInHours <= 48, // 是否符合48小时SLA
      });
    } catch (error) {
      console.error(`分析issue #${issueNumber}响应时间出错:`, error);
      // 即使出错也添加到结果中，但标记为未响应
      analyzedIssues.push({
        number: issueNumber,
        title: issue.title,
        created_at: issue.created_at,
        state: issue.state,
        html_url: issue.html_url,
        hasResponse: false,
        responseTimeInHours: null,
        meetsSLA: false,
        error: '分析此issue时发生错误',
      });
    }
  }

  return analyzedIssues;
}
