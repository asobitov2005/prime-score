function resolveFrontendApiBaseUrl() {
  return (
    process.env.API_INTERNAL_BASE_URL
    ?? "http://127.0.0.1:8000/api"
  ).replace(/\/$/, "");
}

const frontendApiBaseUrl = resolveFrontendApiBaseUrl();

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${frontendApiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
