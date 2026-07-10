"use client";

import { ADMIN_PUBLIC_API_BASE_URL } from "./dependencies";



export const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

export type PlanOption = {
  id: string;
  name: string;
  duration_days: number;
  price: number | string;
  discount_percent: number;
  is_active: boolean;
};

export type GiftCodeRow = {
  id: string;
  code: string;
  plan_id: string | null;
  plan_name: string;
  duration_days: number | null;
  status: "available" | "paused" | "redeemed" | "revoked" | "expired";
  raw_status: string;
  start_date: string | null;
  end_date: string | null;
  max_uses: number;
  used_count: number;
  remaining_uses: number | null;
  per_user_limit: number;
  target_user_type: "all" | "premium" | "free";
  redeemed_at: string | null;
  created_at: string | null;
  recipient_user_id: string | null;
  recipient_name: string | null;
  recipient_username: string | null;
};

export type CreateGiftCodesResponse = {
  message: string;
  items: GiftCodeRow[];
};

export function formatDateTime(value: string | null, fallback = "No date"): string {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatPrice(value: number | string): string {
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numeric)) {
    return `${value} UZS`;
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(numeric) + " UZS";
}

export function formatDateTimeInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function parseDateTimeInputValue(value: string): Date | null {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    return null;
  }

  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function getDateInputPart(value: string): string {
  return value.split("T")[0] ?? "";
}

export function getTimeInputPart(value: string): string {
  const timePart = value.split("T")[1];
  return timePart ? timePart.slice(0, 5) : "";
}

export function setDateInputPart(value: string, nextDatePart: string): string {
  if (!nextDatePart) {
    return "";
  }

  return `${nextDatePart}T${getTimeInputPart(value) || "00:00"}`;
}

export function setTimeInputPart(value: string, nextTimePart: string): string {
  const currentDatePart = getDateInputPart(value);
  if (!currentDatePart) {
    return "";
  }

  return `${currentDatePart}T${nextTimePart || "00:00"}`;
}

export function clampTimeInputPart(timePart: string, minTimePart?: string): string {
  if (!timePart) {
    return minTimePart ?? "00:00";
  }

  if (!minTimePart) {
    return timePart;
  }

  return timePart < minTimePart ? minTimePart : timePart;
}

export function roundUpToMinuteStep(date: Date, minuteStep = 5): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);

  const remainder = next.getMinutes() % minuteStep;
  if (remainder !== 0 || next.getTime() <= date.getTime()) {
    next.setMinutes(next.getMinutes() + (remainder === 0 ? minuteStep : minuteStep - remainder));
  }

  return next;
}

export function addMinutesToDateTimeInputValue(baseValue: string, minutes: number): string {
  const baseDate = parseDateTimeInputValue(baseValue) ?? roundUpToMinuteStep(new Date());
  const nextDate = new Date(baseDate);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return formatDateTimeInputValue(nextDate);
}

export function addDaysToDateTimeInputValue(baseValue: string, days: number): string {
  const baseDate = parseDateTimeInputValue(baseValue) ?? roundUpToMinuteStep(new Date());
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + days);
  return formatDateTimeInputValue(nextDate);
}

export function formatDateTimeEntryLabel(value: string): string {
  const parsed = parseDateTimeInputValue(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function formatDateOnlyInputValue(date: Date): string {
  return formatDateTimeInputValue(date).split("T")[0] ?? "";
}

export function formatDateTimeButtonLabel(value: string): string {
  const parsed = parseDateTimeInputValue(value);
  if (!parsed) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function startOfCalendarWeek(date: Date): Date {
  const next = new Date(date);
  const weekday = next.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  next.setDate(next.getDate() + offset);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function isSameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

export function isBeforeDay(left: Date, right: Date): boolean {
  return startOfDay(left).getTime() < startOfDay(right).getTime();
}

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getMonthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}
