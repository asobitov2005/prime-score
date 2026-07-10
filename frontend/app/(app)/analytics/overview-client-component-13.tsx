"use client";

export function skillStatus(score: number | null) {
  if (score === null) return { label: "No data", className: "border-slate-200 bg-slate-50 text-slate-500" };
  if (score >= 6.5) return { label: "Strength", className: "border-emerald-100 bg-emerald-50 text-emerald-600" };
  if (score >= 5) return { label: "Improving", className: "border-amber-100 bg-amber-50 text-amber-700" };
  return { label: "Needs focus", className: "border-red-100 bg-red-50 text-red-600" };
}
