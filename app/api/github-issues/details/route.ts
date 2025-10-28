import { Octokit } from '@octokit/rest';
import { NextResponse } from 'next/server';

const octokit = new Octokit({
  auth: process.env.PERSONAL_GITHUB_TOKEN,
});

export const maxDuration = 10;
export const dynamic = 'force-dynamic';

/**
 * 获取单个issue的详细信息（评论和时间线）
 * 返回原始数据给前端进行分析
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { repo, issueNumber } = body;

    if (!repo || !issueNumber) {
      return NextResponse.json({ error: '仓库和issue编号是必须的' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    console.log(`🔍 获取 ${repo} #${issueNumber} 的详细信息`);

    // 并发获取评论和时间线数据
    const [commentsResponse, timelineResponse] = await Promise.all([
      // 获取前10条评论（通常足够找到第一条有效响应）
      octokit.issues.listComments({
        owner,
        repo: repoName,
        issue_number: issueNumber,
        per_page: 10,
      }),
      // 获取时间线事件
      octokit.issues.listEventsForTimeline({
        owner,
        repo: repoName,
        issue_number: issueNumber,
        per_page: 50,
      }),
    ]);

    const result = {
      comments: commentsResponse.data.map((comment: any) => ({
        id: comment.id,
        user: comment.user?.login,
        userType: comment.user?.type,
        created_at: comment.created_at,
        body: comment.body?.substring(0, 200), // 只返回前200字符
      })),
      timeline: timelineResponse.data.map((event: any) => ({
        id: event.id,
        event: event.event,
        created_at: event.created_at,
        actor: event.actor?.login,
        actorType: event.actor?.type, // 添加 actor 类型以便排除 bot
        label: event.label?.name,
        source: event.source?.issue?.number, // PR引用
      })),
    };

    console.log(
      `✅ 获取完成: ${result.comments.length} 条评论, ${result.timeline.length} 条时间线`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('获取issue详情失败:', error);
    return NextResponse.json(
      {
        error: '获取详情时出错',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
