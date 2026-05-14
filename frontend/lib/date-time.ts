export const APP_TIME_ZONE = "Asia/Tashkent";

function toValidDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function formatDate(value: string | null | undefined): string {
  const parsed = toValidDate(value);
  if (!parsed) {
    return value ?? "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(parsed);
}

export function formatDateTime(value: string | null | undefined): string {
  const parsed = toValidDate(value);
  if (!parsed) {
    return value ?? "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).format(parsed);
}

export function formatTime(value: string | null | undefined): string {
  const parsed = toValidDate(value);
  if (!parsed) {
    return value ?? "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).format(parsed);
}

export function formatCompletedAtLabel(value: string | null | undefined): string | null {
  const parsed = toValidDate(value);
  if (!parsed) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).formatToParts(parsed);

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `Completed on ${lookup("month")} ${lookup("day")}, ${lookup("year")} at ${lookup("hour")}:${lookup("minute")}`;
}
