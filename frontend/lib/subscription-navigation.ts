export const SUBSCRIPTION_PATH = "/subscription";

export function buildLoginHref(returnUrl: string): string {
  const safeReturnUrl = returnUrl.startsWith("/") && !returnUrl.startsWith("//")
    ? returnUrl
    : "/dashboard";

  return `/login?returnUrl=${encodeURIComponent(safeReturnUrl)}`;
}

export function getSubscriptionPageHref(isAuthenticated: boolean): string {
  return isAuthenticated ? SUBSCRIPTION_PATH : buildLoginHref(SUBSCRIPTION_PATH);
}
