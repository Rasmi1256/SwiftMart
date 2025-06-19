// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['placehold.co'],
    dangerouslyAllowSVG: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/users/:path*',
        destination: 'http://localhost:3001/api/users/:path*', // User Service
      },
      {
        source: '/api/products/:path*',
        destination: 'http://localhost:3002/api/products/:path*', // Product Catalog Service
      },
      {
        source: '/api/categories/:path*',
        destination: 'http://localhost:3002/api/categories/:path*', // Product Catalog Service
      },
      {
        source: '/api/cart/:path*',
        destination: 'http://localhost:3003/api/cart/:path*', // Order Management Service (Cart)
      },
      {
        source: '/api/orders/:path*',
        destination: 'http://localhost:3003/api/orders/:path*', // Order Management Service (Orders)
      },
      // Add other microservices here as they are developed
    ];
  },
};

module.exports = nextConfig;