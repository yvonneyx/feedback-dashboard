import { Octokit } from '@octokit/rest';
import { NextResponse } from 'next/server';

// 配置GitHub API客户端
const octokit = new Octokit({
  auth: process.env.PERSONAL_GITHUB_TOKEN,
});

// App Router 路由配置
export const maxDuration = 10; // 限制为 10 秒
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { startDate, endDate, repo, limit = 500 } = body;

    console.log('📥 收到请求参数:', { startDate, endDate, repo, limit });

    if (!repo) {
      return NextResponse.json({ error: '仓库参数是必须的' }, { status: 400 });
    }

    const [owner, repoName] = repo.split('/');

    console.log(`🔍 获取 ${repo} 的基础issues数据 (${startDate} ~ ${endDate})，限制${limit}条`);

    // 只获取基础issues列表，不做分析
    const issues = await fetchIssuesSimple(owner, repoName, startDate, endDate, limit);
    console.log(`📊 获取到 ${issues.length} 个issues`);

    // 只返回基础数据，所有分析逻辑在前端完成
    const issuesWithRepo = issues.map((issue: any) => ({
      number: issue.number,
      title: issue.title,
      created_at: issue.created_at,
      closed_at: issue.closed_at,
      state: issue.state,
      html_url: issue.html_url,
      user: issue.user?.login,
      labels: issue.labels?.map((l: any) => l.name) || [],
      comments: issue.comments || 0,
      updated_at: issue.updated_at,
      repo: repo,
    }));

    console.log(`✅ ${repo} 基础数据返回完成: ${issuesWithRepo.length} 条`);
    return NextResponse.json(issuesWithRepo);
  } catch (error) {
    console.error('获取GitHub issues失败:', error);
    return NextResponse.json(
      {
        error: '获取GitHub数据时出错',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// 分页获取所有issues - 不设上限
async function fetchIssuesSimple(
  owner: string,
  repo: string,
  startDate: string,
  endDate: string,
  limit: number = 500
) {
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);
  endDateTime.setDate(endDateTime.getDate() + 1);

  const formattedStartDate = startDateTime.toISOString();
  const formattedEndDate = endDateTime.toISOString();

  const query = `repo:${owner}/${repo} is:issue created:${formattedStartDate}..${formattedEndDate}`;

  console.log(`执行查询: ${query}, 将分页获取所有数据`);

  try {
    // 先获取第一页以了解总数
    const firstPageResponse = await octokit.search.issuesAndPullRequests({
      q: query,
      per_page: 100,
      page: 1,
      sort: 'created',
      order: 'desc',
    });

    const totalCount = firstPageResponse.data.total_count;
    console.log(`总共有 ${totalCount} 个issues，开始分页获取...`);

    if (totalCount === 0) {
      console.warn(`⚠️ 查询结果为空: ${query}`);
      return [];
    }

    let allIssues = [...firstPageResponse.data.items];
    const totalPages = Math.ceil(totalCount / 100);

    // 如果有多页，继续获取剩余页面
    if (totalPages > 1) {
      for (let page = 2; page <= totalPages && page <= 10; page++) {
        // 最多10页，即1000条数据
        console.log(`获取第 ${page}/${Math.min(totalPages, 10)} 页...`);
        const response = await octokit.search.issuesAndPullRequests({
          q: query,
          per_page: 100,
          page: page,
          sort: 'created',
          order: 'desc',
        });
        allIssues = [...allIssues, ...response.data.items];

        // 添加延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`✅ 成功获取 ${allIssues.length}/${totalCount} 个issues`);
    return allIssues;
  } catch (error) {
    console.error('获取issues失败:', error);
    throw error;
  }
}
