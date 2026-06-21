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
  async redirects() {
    return [
      { source: "/pricing", destination: "/#pricing", permanent: true },
      { source: "/reviews", destination: "/#reviews", permanent: true },
      { source: "/ielts-mock-test-online", destination: "/", permanent: true },
      { source: "/ielts-mock-test-uzbekistan", destination: "/", permanent: true },
      { source: "/ielts-mock-test-tashkent", destination: "/", permanent: true },
    ];
  },
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
