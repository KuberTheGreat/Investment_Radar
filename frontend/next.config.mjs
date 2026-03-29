/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // In Docker: BACKEND_URL is not set so Next.js itself isn't used for proxying  
    // (Nginx directly routes /api/ to backend). This rewrite only applies when
    // running `npm run dev` locally, where BACKEND_URL=http://localhost:8000/api
    const backendBase = process.env.BACKEND_URL || 'http://127.0.0.1:8000/api';
    
    return [
      {
        source: '/api/:path((?!auth).*)',
        destination: `${backendBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
