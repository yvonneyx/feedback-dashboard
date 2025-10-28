import { Octokit } from '@octokit/rest';
import { NextResponse } from 'next/server';

const octokit = new Octokit({
  auth: process.env.PERSONAL_GITHUB_TOKEN,
});

// 成员缓存（服务端）
const memberCache = new Map<string, { isMember: boolean; timestamp: number }>();
const allMembersCache = { members: new Set<string>(), timestamp: 0, loading: false };
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时缓存

export const dynamic = 'force-dynamic';

/**
 * 获取所有 AntV 组织成员（包括私有成员）
 */
async function getAllAntVMembers(): Promise<Set<string>> {
  // 检查缓存是否有效
  if (allMembersCache.timestamp && Date.now() - allMembersCache.timestamp < CACHE_TTL) {
    console.log(`📦 使用成员列表缓存 (${allMembersCache.members.size} 个成员)`);
    return allMembersCache.members;
  }

  // 避免并发请求重复获取
  if (allMembersCache.loading) {
    console.log('⏳ 等待成员列表加载中...');
    // 等待最多5秒
    let waited = 0;
    while (allMembersCache.loading && waited < 5000) {
      await new Promise(resolve => setTimeout(resolve, 100));
      waited += 100;
    }
    if (allMembersCache.members.size > 0) {
      return allMembersCache.members;
    }
  }

  allMembersCache.loading = true;
  console.log('🔄 刷新 AntV 成员列表（包括 public 和 private 成员）...');
  const members = new Set<string>();

  try {
    // 获取所有成员（默认包括 public 和 private）
    // 注意：需要有 read:org 权限的 token
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await octokit.orgs.listMembers({
        org: 'antvis',
        per_page: 100,
        page: page,
        // filter: 'all' 是默认值，返回所有成员（public + private）
      });

      response.data.forEach((member: any) => {
        members.add(member.login.toLowerCase());
      });

      hasMore = response.data.length === 100;
      page++;
    }

    console.log(`✅ 获取到 ${members.size} 个 AntV 成员（包括 public 和 private）`);

    // 更新缓存
    allMembersCache.members = members;
    allMembersCache.timestamp = Date.now();
    allMembersCache.loading = false;

    return members;
  } catch (error) {
    console.error('获取成员列表失败:', error);
    allMembersCache.loading = false;
    // 如果获取失败，返回旧缓存
    return allMembersCache.members;
  }
}

// 预加载成员列表（启动时执行）
console.log('🚀 预加载 AntV 成员列表...');
getAllAntVMembers()
  .then(() => {
    console.log(`✅ AntV 成员列表预加载完成: ${allMembersCache.members.size} 个成员`);
  })
  .catch(err => {
    console.error('❌ 预加载成员列表失败:', err);
  });

/**
 * 检查用户是否是 AntV 组织成员
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: '用户名是必须的' }, { status: 400 });
    }

    const usernameLower = username.toLowerCase();
    console.log(`🔍 检查用户 ${username} 是否是 AntV 成员`);

    // 检查单个用户缓存
    const cached = memberCache.get(usernameLower);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`📦 使用缓存: ${username} -> ${cached.isMember}`);
      return NextResponse.json({ isMember: cached.isMember });
    }

    // 获取所有成员列表并检查
    const allMembers = await getAllAntVMembers();
    const isMember = allMembers.has(usernameLower);

    // 更新缓存
    memberCache.set(usernameLower, { isMember, timestamp: Date.now() });

    console.log(`${isMember ? '✅' : '❌'} ${username} ${isMember ? '是' : '不是'} AntV 成员`);
    return NextResponse.json({ isMember });
  } catch (error) {
    console.error('检查成员关系失败:', error);
    return NextResponse.json(
      {
        error: '检查成员关系时出错',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
