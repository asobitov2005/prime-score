"use client";



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

export function buildCalendarDays(month: Date): Array<{ date: Date; inCurrentMonth: boolean }> {
  const monthStart = startOfMonth(month);
  const gridStart = startOfCalendarWeek(monthStart);

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    return {
      date: cellDate,
      inCurrentMonth: cellDate.getMonth() === monthStart.getMonth(),
    };
  });
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type DateTimePickerFieldProps = {
  value: string;
  onChange: (nextValue: string) => void;
  minValue?: string;
  placeholder: string;
};
