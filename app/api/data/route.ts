import { fetchSecureData } from '@/app/lib/api-service';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // 从URL参数获取endpoint
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'default';

    // 使用服务端API服务获取数据
    const data = await fetchSecureData(endpoint);

    return NextResponse.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
