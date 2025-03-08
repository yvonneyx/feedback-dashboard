import { NextResponse } from 'next/server';

export async function GET() {
  const apiToken = process.env.API_TOKEN; 
  
  // 使用令牌进行 API 调用
  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  
  const data = await response.json();
  return NextResponse.json(data);
} 
