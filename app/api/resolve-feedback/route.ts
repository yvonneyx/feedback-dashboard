import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { objectId, resolved } = await request.json();

    const appId = process.env.LEANCLOUD_APP_ID;
    const appKey = process.env.LEANCLOUD_APP_KEY;

    if (!objectId) {
      return NextResponse.json({ error: '缺少对象ID' }, { status: 400 });
    }

    // 构建LeanCloud的API请求
    const url = `https://api.leancloud.cn/1.1/classes/UserFeedback/${objectId}`;
    const data = { isResolved: resolved ? '1' : '0' };

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-LC-Id': appId,
        'X-LC-Key': appKey,
        'Content-Type': 'application/json',
      } as HeadersInit,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '更新失败');
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: `已${resolved ? '解决' : '取消解决'}该反馈`,
      data: result,
    });
  } catch (error) {
    console.error('更新反馈状态失败:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '未知错误',
      },
      {
        status: 500,
      }
    );
  }
}
