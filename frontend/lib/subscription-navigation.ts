export const SUBSCRIPTION_PATH = "/subscription";
const APP_RETURN_URL_ORIGIN = "https://primescore.local";

export function resolveSafeReturnUrl(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const target = new URL(value, APP_RETURN_URL_ORIGIN);
    if (target.origin !== APP_RETURN_URL_ORIGIN) {
      return fallback;
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}

export function buildLoginHref(returnUrl: string): string {
  const safeReturnUrl = resolveSafeReturnUrl(returnUrl);

  return `/login?returnUrl=${encodeURIComponent(safeReturnUrl)}`;
}

export function getSubscriptionPageHref(isAuthenticated: boolean): string {
  return isAuthenticated ? SUBSCRIPTION_PATH : buildLoginHref(SUBSCRIPTION_PATH);
}
