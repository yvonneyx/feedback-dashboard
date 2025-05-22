/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['antd'],
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ['@octokit/rest'],
  },
  serverRuntimeConfig: {
    // 增加服务器端的请求超时时间
    apiTimeout: 120000, // 120秒
  },
  // API 路由的超时时间
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
    externalResolver: true,
  },
};

module.exports = nextConfig;
