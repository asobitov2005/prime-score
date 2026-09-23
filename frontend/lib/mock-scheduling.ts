export type OfflineMockSchedule = {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  location: string;
  capacity: number;
  reserved_count: number;
  available_seats: number;
  price_amount: string | number;
  currency: "UZS";
  is_published: boolean;
};

export type OfflineMockBooking = {
  id: string;
  schedule_id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  location: string;
  price_amount: string | number;
  currency: "UZS";
  payment_method: "click";
  payment_confirmation: "manual";
};

export type MockMonth = { year: number; month: number };

export function getTashkentDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function getTashkentMonth(value: Date): MockMonth {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(value);
  return {
    year: Number(parts.find((item) => item.type === "year")?.value),
    month: Number(parts.find((item) => item.type === "month")?.value) - 1,
  };
}

export function getCalendarDays({ year, month }: MockMonth): Array<number | null> {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const leadingEmptyDays = (firstDay + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [
    ...Array<number | null>(leadingEmptyDays).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

export function getTashkentMonthRange({ year, month }: MockMonth): { from: string; to: string } {
  const tashkentOffsetMs = 5 * 60 * 60 * 1000;
  return {
    from: new Date(Date.UTC(year, month, 1) - tashkentOffsetMs).toISOString(),
    to: new Date(Date.UTC(year, month + 1, 1) - tashkentOffsetMs).toISOString(),
  };
}

export function formatMockPrice(value: string | number, currency = "UZS"): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `Price unavailable`;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
}
