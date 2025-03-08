import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { startDate, endDate, repo } = await request.json();

    const appId = 'mAckVaWaCleA1L1tRu0vDkkl-gzGzoHsz';
    const appKey = '5BCFPGawWnS37eHVnzSptNa5';

    // 在使用前检查是否存在
    if (!appId || !appKey) {
      throw new Error('LeanCloud credentials not found');
    }

    const className = 'UserFeedback';

    const url = `https://api.leancloud.cn/1.1/classes/${className}`;

    // 构建查询条件
    const where: any = {
      createdAt: {
        $gte: { __type: 'Date', iso: startDate },
        $lt: { __type: 'Date', iso: endDate },
      },
      ...(repo ? { repo } : {}),
    };

    const params = new URLSearchParams({
      limit: '1000',
      where: JSON.stringify(where),
    });

    // 调用 LeanCloud API
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'X-LC-Id': appId,
        'X-LC-Key': appKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`LeanCloud API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data.results);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
