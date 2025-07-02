/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['antd'],
  reactStrictMode: true,
  serverExternalPackages: ['@octokit/rest'],
};

module.exports = nextConfig;
