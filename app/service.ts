// 获取在构建时注入的环境变量
const apiToken = process.env.NEXT_PUBLIC_API_TOKEN;

export async function fetchData() {
  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${apiToken}`
    }
  });
  return await response.json();
}
