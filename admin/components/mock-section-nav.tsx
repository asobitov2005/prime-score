import Link from "next/link";
import { CalendarDays, Layers3 } from "lucide-react";

import { cn } from "@/components/ui";

export function MockSectionNav({ current }: { current: "online" | "offline" }) {
  return (
    <nav aria-label="Mock management" className="flex flex-wrap gap-2 border-b border-border pb-4">
      {[
        { key: "online", href: "/online-full-mocks", label: "Online Full Mocks", icon: Layers3 },
        { key: "offline", href: "/mock-schedules", label: "Offline Schedules", icon: CalendarDays },
      ].map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={current === key ? "page" : undefined}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            current === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon size={16} aria-hidden="true" />{label}
        </Link>
      ))}
    </nav>
  );
}
