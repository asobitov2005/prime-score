"use client";
import type { UserDetailPageScope } from "./controller";

export function UserDetailPageSection3({ scope }: { scope: UserDetailPageScope }) {
  const { actionMsg } = scope;
  return (
    {actionMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm font-medium text-emerald-600">{actionMsg}</div>
          )}
  );
}
