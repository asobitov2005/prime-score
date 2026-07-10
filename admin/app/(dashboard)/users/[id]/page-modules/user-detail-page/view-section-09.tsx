"use client";
import type { UserDetailPageScope } from "./controller";
import { StatBox, fmtDate } from "../shared";

export function UserDetailPageSection9({ scope }: { scope: UserDetailPageScope }) {
  const { user, completionRate, memberDays } = scope;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatBox label="Urinishlar" value={String(user.attempts_total)} sub={`${user.attempts_completed} yakunlangan`} />
            <StatBox label="O'rtacha ball" value={user.average_band != null ? user.average_band.toFixed(1) : "—"} sub="barcha testlar" />
            <StatBox label="Completion rate" value={`${completionRate}%`} sub={`${user.attempts_completed}/${user.attempts_total}`} />
            <StatBox label="Platformada" value={`${memberDays} kun`} sub={`${fmtDate(user.created_at)} dan`} />
          </div>
  );
}
