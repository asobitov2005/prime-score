"use client";

import { Rarity } from "./user-profile-modal-component-01";

export const rarityConfig: Record<Rarity, { color: string; glow: string; pillBg: string; text: string }> = {
  Legendary: { color: "from-amber-400 to-orange-500", glow: "shadow-amber-500/50", pillBg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20", text: "text-amber-600 dark:text-amber-400" },
  Mythic: { color: "from-rose-400 to-red-600", glow: "shadow-rose-500/50", pillBg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20", text: "text-rose-600 dark:text-rose-400" },
  Epic: { color: "from-purple-400 to-fuchsia-500", glow: "shadow-purple-500/50", pillBg: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20", text: "text-purple-600 dark:text-purple-400" },
  Rare: { color: "from-blue-400 to-indigo-500", glow: "shadow-blue-500/50", pillBg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20", text: "text-blue-600 dark:text-blue-400" },
  Common: { color: "from-slate-400 to-slate-500", glow: "shadow-slate-500/30", pillBg: "bg-slate-100 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/20", text: "text-slate-600 dark:text-slate-300" },
};
