const adminApiBaseUrl = (
  process.env.ADMIN_API_INTERNAL_BASE_URL
  ?? "http://127.0.0.1:8000/api/admin"
).replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/admin/:path*",
        destination: `${adminApiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
