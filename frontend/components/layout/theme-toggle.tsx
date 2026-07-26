"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackUiInteraction } from "@/lib/analytics";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem("prime-theme") as "light" | "dark" | null) ?? "light";
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === "light" ? "dark" : "light";
      localStorage.setItem("prime-theme", newTheme);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(newTheme);
      trackUiInteraction({
        action: "theme_toggle",
        component: "app_sidebar",
        value: newTheme,
      });
      return newTheme;
    });
  };

  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
        className,
      )}
      aria-label="Toggle Light/Dark Mode"
      title="Toggle Light/Dark Mode"
    >
      {isDark ? (
        <Sun className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
      ) : (
        <Moon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
      )}
      <span className="min-w-0 flex-1 text-left">{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
