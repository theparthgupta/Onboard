import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@langchain/langgraph', '@langchain/core', '@octokit/rest'],
};

export default nextConfig;
