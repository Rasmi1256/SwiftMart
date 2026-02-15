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
      {
        source: '/api/products/:path*',
        destination: 'http://localhost:3004/api/products/:path*', // Product Catalog Service
      },
      {
        source: '/api/categories/:path*',
        destination: 'http://localhost:3004/api/categories/:path*', // Product Catalog Service
      },
      // Add other microservices here as they are developed and needed by admin
    ];
  },
};

module.exports = nextConfig;