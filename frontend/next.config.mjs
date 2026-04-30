function resolveFrontendApiBaseUrl() {
  const configured = (
    process.env.API_INTERNAL_BASE_URL
    ?? "http://127.0.0.1:8000/api"
  ).replace(/\/$/, "");

  try {
    const url = new URL(configured);
    const isBrokenDockerAlias = url.hostname === "api" || url.hostname === "backend";
    if (isBrokenDockerAlias && url.port === "8000") {
      return "http://172.17.0.1:8000/api";
    }
  } catch {}

  return configured;
}

const frontendApiBaseUrl = resolveFrontendApiBaseUrl();

/** @type {import('next').NextConfig} */
const nextConfig = {
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
