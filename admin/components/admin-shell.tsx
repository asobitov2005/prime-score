"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Bell, PanelLeft } from "lucide-react";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isBuilderPage = pathname === "/tests/new" || /^\/tests\/[^/]+\/edit$/.test(pathname);

  useEffect(() => {
    const stored = window.localStorage.getItem("admin-sidebar-collapsed");
    if (stored === "1") {
      setSidebarCollapsed(true);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("admin-sidebar-collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  return (
    <div className="flex min-h-screen bg-background bg-[radial-gradient(circle_at_top_left,hsl(var(--accent)/0.26),transparent_42%)]">
      <SidebarNav collapsed={sidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/85 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft className="h-[18px] w-[18px]" />
            </button>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">{pageLabel}</h2>
            <Badge tone="neutral" className="hidden sm:inline-flex text-xs">
              {roleLabel}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
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
          <div className={isBuilderPage ? "mx-auto max-w-[min(1700px,100%)]" : "mx-auto max-w-7xl"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
