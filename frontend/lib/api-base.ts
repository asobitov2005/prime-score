const DEV_CLIENT_API_BASE_URL = "/api";
const DEV_SERVER_API_BASE_URL = "http://127.0.0.1:8000/api";
export const FRONTEND_API_TIMEOUT_MS = 4000;

function remapBrokenLocalApiBaseUrl(value: string, mode: "client" | "server"): string {
  if (process.env.NODE_ENV === "production") {
    return value;
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);
    const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isBrokenDockerAlias = url.hostname === "api" || url.hostname === "backend";
    if (mode === "client" && (isLocalHost || isBrokenDockerAlias) && url.port === "8000") {
      return DEV_CLIENT_API_BASE_URL;
    }

    if (mode === "server" && isBrokenDockerAlias && url.port === "8000") {
      return "http://172.17.0.1:8000/api";
    }
  } catch {
    return value;
  }

  return value;
}

function normalizeConfiguredApiBaseUrl(value: string | null | undefined, mode: "client" | "server"): string | null {
  const trimmed = value?.trim().replace(/\/$/, "");
  if (!trimmed) {
    return null;
  }

  return remapBrokenLocalApiBaseUrl(trimmed, mode);
}

export function getFrontendClientApiBaseUrl(): string {
  return (
    normalizeConfiguredApiBaseUrl(
      process.env.NEXT_PUBLIC_API_BASE_URL
      ?? process.env.API_INTERNAL_BASE_URL,
      "client"
    )
    ?? DEV_CLIENT_API_BASE_URL
  );
}

export function getFrontendServerApiBaseUrl(): string {
  const resolved = (
    normalizeConfiguredApiBaseUrl(
      process.env.API_INTERNAL_BASE_URL
      ?? process.env.NEXT_PUBLIC_API_BASE_URL,
      "server"
    )
    ?? DEV_SERVER_API_BASE_URL
  );

  if (resolved.startsWith("/")) {
    return `${DEV_SERVER_API_BASE_URL}${resolved === "/api" ? "" : resolved.replace(/^\/api/, "")}`;
  }

  return resolved;
}

export function getFrontendClientWebSocketApiBaseUrl(): string {
  const httpBaseUrl = getFrontendClientApiBaseUrl();
  if (typeof window !== "undefined" && httpBaseUrl.startsWith("/")) {
    const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (process.env.NODE_ENV !== "production" && isLocalHost) {
      return `ws://127.0.0.1:8000${httpBaseUrl}`;
    }
  }
  const origin = typeof window === "undefined" ? getFrontendServerApiBaseUrl() : window.location.origin;
  const url = new URL(httpBaseUrl, origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString().replace(/\/$/, "");
}
