"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { adminNavGroups } from "@/lib/nav";
import { Badge, cn } from "@/components/ui";

export function SidebarNav({
  collapsed,
}: {
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <aside
      className={cn(
        "hidden flex-col border-r border-border bg-card/70 transition-all duration-300 lg:sticky lg:top-0 lg:flex lg:h-screen",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className={cn("flex-1 overflow-y-auto py-6 transition-all duration-300", collapsed ? "px-2" : "px-4")}>
        <nav className="space-y-8">
          {adminNavGroups.map((group) => (
            <div key={group.label}>
              {!collapsed ? (
                <p className="mb-3 px-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground opacity-80">
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const hrefPath = item.href.split("?")[0];
                  const hrefParams = new URLSearchParams(item.href.split("?")[1] ?? "");
                  const hasQuery = item.href.includes("?");
                  let active = false;
                  if (item.href.startsWith("http")) {
                    active = false;
                  } else if (hrefPath === "/") {
                    active = pathname === "/";
                  } else if (hasQuery) {
                    active = pathname === hrefPath && Array.from(hrefParams.entries()).every(([k, v]) => searchParams.get(k) === v);
                  } else {
                    active = pathname === hrefPath || pathname.startsWith(hrefPath + "/");
                  }
                    
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center rounded-xl text-[15px] font-semibold transition-all duration-200",
                        collapsed ? "justify-center px-2 py-3" : "justify-between gap-3 px-4 py-3",
                        active
                          ? "bg-primary text-background shadow-md translate-x-1"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-1 active:scale-95"
                      )}
                    >
                      <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3.5")}>
                        {Icon && <Icon className={cn("h-5 w-5", active ? "opacity-100" : "opacity-70")} />}
                        {!collapsed ? <span>{item.label}</span> : null}
                      </div>
                      {!collapsed && item.badge ? (
                        <Badge 
                          tone="neutral" 
                          className={cn(
                            "px-2 py-0.5 h-5 text-[10px] uppercase font-black tracking-widest",
                            active ? "bg-background/20 text-background border-none" : "bg-muted-foreground/10 border-border"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
