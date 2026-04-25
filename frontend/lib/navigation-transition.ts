export const PRIME_NAVIGATION_START_EVENT = "primescore:navigation-start";
const PRIME_PENDING_PUBLIC_REDIRECT_KEY = "prime:pending-public-redirect";

export function emitNavigationStart(href: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(PRIME_NAVIGATION_START_EVENT, {
      detail: { href }
    })
  );
}

export function setPendingPublicRedirect(href: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(PRIME_PENDING_PUBLIC_REDIRECT_KEY, href);
}

export function consumePendingPublicRedirect() {
  if (typeof window === "undefined") {
    return null;
  }

  const href = window.sessionStorage.getItem(PRIME_PENDING_PUBLIC_REDIRECT_KEY);
  if (!href) {
    return null;
  }

  window.sessionStorage.removeItem(PRIME_PENDING_PUBLIC_REDIRECT_KEY);
  return href;
}
