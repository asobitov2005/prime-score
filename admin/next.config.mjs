function resolveAdminApiBaseUrl() {
  const configured = (
    process.env.ADMIN_API_INTERNAL_BASE_URL
    ?? "http://127.0.0.1:8000/api/admin"
  ).replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    return configured;
  }

  try {
    const url = new URL(configured);
    const isBrokenDockerAlias = url.hostname === "api" || url.hostname === "backend";
    if (isBrokenDockerAlias && url.port === "8000") {
      return "http://172.17.0.1:8000/api/admin";
    }
  } catch {
    return configured;
  }

  return configured;
}

const adminApiBaseUrl = resolveAdminApiBaseUrl();
const adminApiRootBaseUrl = adminApiBaseUrl.replace(/\/admin$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    return [
      {
        source: "/api/storage/:path*",
        destination: `${adminApiRootBaseUrl}/storage/:path*`,
      },
      {
        source: "/api/admin/:path*",
        destination: `${adminApiBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
