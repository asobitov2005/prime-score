"use client";

export // Calculate the number of days ago for a given date
function getDaysAgoText(dateStr: string | null | undefined): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Never";
  
  const now = new Date();
  // Clear times to compare days only
  now.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const timeDiff = now.getTime() - targetDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
  
  if (daysDiff < 0) return "Just now";
  if (daysDiff === 0) return "Today";
  if (daysDiff === 1) return "1 day ago";
  return `${daysDiff} days ago`;
}
