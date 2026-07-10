"use client";

export // Check if a date string represents a timestamp within the last 7 days
function isWithinLast7Days(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const timeDiff = now.getTime() - date.getTime();
  const daysDiff = timeDiff / (1000 * 3600 * 24);
  return daysDiff >= 0 && daysDiff <= 7;
}
