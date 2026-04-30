const DEV_ADMIN_CLIENT_API_BASE_URL = "/api/admin";
const DEV_ADMIN_SERVER_API_BASE_URL = "http://127.0.0.1:8000/api/admin";

function remapBrokenLocalAdminApiBaseUrl(value: string, mode: "client" | "server"): string {
  if (process.env.NODE_ENV === "production") {
    return value;
  }

  try {
    const url = new URL(value);
    const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isBrokenDockerAlias = url.hostname === "api" || url.hostname === "backend";
    if (mode === "client" && (isLocalHost || isBrokenDockerAlias) && url.port === "8000") {
      return DEV_ADMIN_CLIENT_API_BASE_URL;
    }

    if (mode === "server" && isBrokenDockerAlias && url.port === "8000") {
      return "http://172.17.0.1:8000/api/admin";
    }
  } catch {
    return value;
  }

  return value;
}

function normalizeConfiguredAdminApiBaseUrl(value: string | null | undefined, mode: "client" | "server"): string | null {
  const trimmed = value?.trim().replace(/\/$/, "");
  if (!trimmed) {
    return null;
  }

  return remapBrokenLocalAdminApiBaseUrl(trimmed, mode);
}

export function getAdminClientApiBaseUrl(): string {
  return (
    normalizeConfiguredAdminApiBaseUrl(
      process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL
      ?? process.env.ADMIN_API_INTERNAL_BASE_URL,
      "client"
    )
    ?? DEV_ADMIN_CLIENT_API_BASE_URL
  );
}

export function getAdminServerApiBaseUrl(): string {
  const resolved = (
    normalizeConfiguredAdminApiBaseUrl(
      process.env.ADMIN_API_INTERNAL_BASE_URL
      ?? process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL,
      "server"
    )
    ?? DEV_ADMIN_SERVER_API_BASE_URL
  );

  if (resolved.startsWith("/")) {
    return `${DEV_ADMIN_SERVER_API_BASE_URL}${resolved === "/api/admin" ? "" : resolved.replace(/^\/api\/admin/, "")}`;
  }

  return resolved;
}
