/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/users/:path*',
        destination: 'http://localhost:3001/api/users/:path*', // User Service
      },
      {
        source: '/api/orders/:path*',
        destination: 'http://localhost:3003/api/orders/:path*', // Order Management Service
      },
      // Add other microservices here as they are developed and needed by admin
    ];
  },
};

module.exports = nextConfig;