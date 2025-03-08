// 服务端安全API服务
export async function fetchSecureData(endpoint: string) {
  // 环境变量在服务端安全访问
  const apiToken = process.env.API_TOKEN;

  if (!apiToken) {
    console.error('API Token not found');
    throw new Error('API configuration error');
  }

  try {
    const response = await fetch(`https://api.example.com/${endpoint}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
