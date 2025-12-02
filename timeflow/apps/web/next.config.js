/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@timeflow/shared', '@timeflow/scheduling'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

