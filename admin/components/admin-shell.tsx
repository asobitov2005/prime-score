"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Search, Bell } from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { SidebarNav } from "@/components/sidebar-nav";
import { Badge } from "@/components/ui";
import { adminNavGroups } from "@/lib/nav";
import type { AdminIdentity } from "@/lib/types";

function resolvePageLabel(pathname: string): string {
  const allItems = adminNavGroups.flatMap((group) => group.items);
  const match = allItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return match?.label ?? "Dashboard";
}

export function AdminShell({
  children,
  admin,
}: {
  children: ReactNode;
  admin: AdminIdentity;
}) {
  const pathname = usePathname();
  const pageLabel = resolvePageLabel(pathname);
  const initials = admin.username.slice(0, 2).toUpperCase();
  const roleLabel = admin.role === "super_admin" ? "Super Admin" : "Admin";

  return (
    <div className="flex min-h-screen bg-background bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.26),transparent_42%)]">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/85 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{pageLabel}</h2>
            <Badge tone="neutral" className="hidden sm:inline-flex text-xs">
              {roleLabel}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden w-64 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground lg:flex">
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </div>
            
            <button className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Bell className="h-5 w-5" />
            </button>

            <div className="h-8 w-px bg-border mx-2" />

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-foreground">{admin.username}</p>
                <p className="text-xs text-muted-foreground">{admin.email}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
                {initials}
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 xl:p-10">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
