/** @type {import('next').NextConfig} */
const defaultBackend =
  process.env.BACKEND_ORIGIN?.replace(/\/$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '').replace(/\/$/, '') ||
  'https://finxpert-gl51.onrender.com';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${defaultBackend}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
