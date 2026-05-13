const NOTIFICATION_REFRESH_EVENT = "primescore:notifications-refresh";

export function emitNotificationRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(NOTIFICATION_REFRESH_EVENT));
}

export function listenNotificationRefresh(handler: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = () => {
    handler();
  };
  window.addEventListener(NOTIFICATION_REFRESH_EVENT, listener);
  return () => window.removeEventListener(NOTIFICATION_REFRESH_EVENT, listener);
}
