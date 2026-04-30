export const USER_ACCESS_TOKEN_COOKIE = "primescore_user_access_token";
export const USER_REFRESH_TOKEN_COOKIE = "primescore_user_refresh_token";
export const USER_SESSION_ID_COOKIE = "primescore_user_session_id";

const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function writeBrowserCookie(name: string, value: string | null, maxAge: number = COOKIE_MAX_AGE_SECONDS) {
  if (typeof document === "undefined") {
    return;
  }

  if (!value) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

function readBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${name}=`;
  for (const item of document.cookie.split(";")) {
    const trimmed = item.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

export function syncBrowserSessionCookies(payload: {
  accessToken?: string | null;
  refreshToken?: string | null;
  sessionId?: string | null;
}) {
  if (payload.accessToken !== undefined) {
    writeBrowserCookie(USER_ACCESS_TOKEN_COOKIE, payload.accessToken);
  }
  if (payload.refreshToken !== undefined) {
    writeBrowserCookie(USER_REFRESH_TOKEN_COOKIE, payload.refreshToken);
  }
  if (payload.sessionId !== undefined) {
    writeBrowserCookie(USER_SESSION_ID_COOKIE, payload.sessionId);
  }
}

export function clearBrowserSessionCookies() {
  syncBrowserSessionCookies({
    accessToken: null,
    refreshToken: null,
    sessionId: null,
  });
}

export function readBrowserSessionCookies() {
  return {
    accessToken: readBrowserCookie(USER_ACCESS_TOKEN_COOKIE),
    refreshToken: readBrowserCookie(USER_REFRESH_TOKEN_COOKIE),
    sessionId: readBrowserCookie(USER_SESSION_ID_COOKIE),
  };
}
