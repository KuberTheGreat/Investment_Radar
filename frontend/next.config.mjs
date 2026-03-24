/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Determine the base backend URL, stripping trailing slashes if present
    let baseUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000/api';
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // Ensure :path* is appended to whatever the base URL is
    let destination = baseUrl.endsWith(':path*') ? baseUrl : `${baseUrl}/:path*`;

    return [
      {
        source: '/api/:path*',
        destination: destination,
      },
    ];
  },
};

export default nextConfig;
