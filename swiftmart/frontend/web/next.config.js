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

      // ⬇️ If you *actually* have /api/cart/* routes in the orders service
      {
        source: '/api/cart/:path*',
        destination: 'http://localhost:3106/api/cart/:path*', // Orders service (if you have /cart endpoints)
      },

      // ⬇️ This one is the important part for your cart page
      {
        source: '/api/orders/:path*',
        destination: 'http://localhost:3106/api/orders/:path*', // ✅ Orders service on port 3105
      },

      {
        source: '/api/delivery/:path*',
        destination: 'http://localhost:3004/api/delivery/:path*', // Delivery Service
      },
      {
        source: '/api/recommendations/:path*',
        destination: 'http://localhost:3005/recommendations/:path*', // FastAPI (no /api)
      },
      {
        source: '/api/forecast/:path*',
        destination: 'http://localhost:3006/forecast/:path*', // FastAPI (no /api)
      },
      {
        source: '/api/prices/:path*',
        destination: 'http://localhost:3007/prices/:path*',
      },
      {
        source: '/api/inventory/:path*',
        destination: 'http://localhost:3008/api/inventory/:path*',
      },
      {
        source: '/api/chatbot/:path*',
        destination: 'http://localhost:3009/chat/:path*', // FastAPI (no /api)
      },
    ];
  },
};

module.exports = nextConfig;
