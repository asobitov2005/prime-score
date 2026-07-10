"use client";

import { ADMIN_PUBLIC_API_BASE_URL, Badge, Card, CardContent, cn } from "./dependencies";



export const API_BASE = ADMIN_PUBLIC_API_BASE_URL;

export type UserDetail = {
  id: string;
  telegram_id: number;
  first_name: string;
  last_name: string | null;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_premium: boolean;
  premium_until: string | null;
  show_on_leaderboard: boolean;
  bot_contact_at: string | null;
  first_login_at: string | null;
  last_active_at: string | null;
  created_at: string | null;
  attempts_total: number;
  attempts_completed: number;
  average_band: number | null;
};

export type AttemptBreakdownItem = {
  label: string;
  correct: number;
  total: number;
};

export type AttemptReviewItem = {
  question_id: string;
  question_number: number;
  question_label?: string | null;
  prompt: string;
  section_title: string;
  group_title: string;
  question_type: string;
  options: string[];
  answer_value?: string | null;
  is_correct?: boolean | null;
  correct_answers: string[];
  explanation?: string | null;
};

export type UserAttemptActivity = {
  attempt_id: string;
  test_id: string;
  test_title?: string | null;
  test_type?: "reading" | "listening" | null;
  scope: string;
  mode: string;
  status: string;
  score_status: string;
  raw_score?: number | null;
  band_score?: number | string | null;
  answers_count: number;
  answered_slots_count: number;
  total_questions: number;
  time_spent_sec: number;
  started_at: string;
  completed_at?: string | null;
  result?: {
    section_breakdown: AttemptBreakdownItem[];
    question_type_breakdown: AttemptBreakdownItem[];
  } | null;
  review?: {
    can_show_explanations: boolean;
    items: AttemptReviewItem[];
  } | null;
};

export type UserWritingSubmissionActivity = {
  id: string;
  task_id: string;
  task_title: string;
  task_type: "task_1" | "task_2";
  word_count: number;
  status: string;
  submitted_at: string;
  graded_at?: string | null;
  overall_band?: number | null;
  error_message?: string | null;
};

export type UserActivity = {
  attempts: UserAttemptActivity[];
  writing_submissions: UserWritingSubmissionActivity[];
};

export function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export function daysLeft(iso: string | null): string {
  if (!iso) return "";
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff <= 0) return "(muddati tugagan)";
  return `(${diff} kun qoldi)`;
}

export const IconChevron = ({ open }: { open: boolean }) => <svg className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>;

export const IconCrown = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8l4 4 4-7 4 7 4-4v11H4V8Z" /></svg>;

export const IconEye = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>;

export const IconEyeOff = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58A2.5 2.5 0 0 0 13.42 13.42" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.2 6.2C4 7.8 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.6 0 3.02-.25 4.27-.68" /><path strokeLinecap="round" strokeLinejoin="round" d="M9.88 4.42A10.88 10.88 0 0 1 12 4.5c6 0 9.5 7.5 9.5 7.5a20.4 20.4 0 0 1-3.3 4.52" /></svg>;

export const IconTrash = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;

export const IconBan = () => <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.5 8.5 15.5 15.5" /></svg>;

export const IconAlert = () => <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86 2.82 17a2 2 0 0 0 1.71 3h15.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>;

export function humanizeStatus(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const normalized = value.toLowerCase();
  if (normalized === "queued") return "Queued";
  if (normalized === "running" || normalized === "processing" || normalized === "in_progress") return "Running";
  if (normalized === "completed") return "Completed";
  if (normalized === "failed") return "Failed";
  if (normalized === "auto_submitted") return "Auto-submitted";
  return value.replace(/_/g, " ");
}

export function statusTone(value: string | null | undefined): "success" | "warning" | "danger" | "neutral" {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "completed") return "success";
  if (normalized === "failed") return "danger";
  if (normalized === "queued" || normalized === "running" || normalized === "processing" || normalized === "in_progress") return "warning";
  return "neutral";
}

export function StatBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-2xl font-black text-foreground mt-1">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

export function InfoRow({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: "success" | "neutral" | "paused" | "warning" }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 border-b border-border/30 last:border-none">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground shrink-0">{label}</span>
      {badge ? (
        <Badge tone={badge === "warning" ? "warning" : badge} className="text-[10px] uppercase font-black tracking-widest">{value}</Badge>
      ) : (
        <span className={`text-sm font-medium text-foreground text-right truncate ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
      )}
    </div>
  );
}
