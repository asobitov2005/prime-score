"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { adminNavGroups } from "@/lib/nav";
import { Badge, cn } from "@/components/ui";

export function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <aside className="hidden w-64 flex-col border-r border-border bg-card/70 lg:sticky lg:top-0 lg:flex lg:h-screen">
      <div className="h-28 md:h-36 flex items-center px-6 border-b border-border bg-background/50">
        <Link href="/" className="flex items-center gap-2 group transition-transform duration-300 hover:scale-[1.02] focus-visible:outline-none">
          <div className="h-20 md:h-28">
            <img src="/logo.svg" alt="PrimeScore Admin" className="h-full w-auto object-contain" />
          </div>
          <span className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity">Admin</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4">
        <nav className="space-y-8">
          {adminNavGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-3 opacity-80">
                {group.label}
              </p>
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
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold transition-all duration-200",
                        active
                          ? "bg-primary text-background shadow-md translate-x-1"
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-1 active:scale-95"
                      )}
                    >
                      <div className="flex items-center gap-3.5">
                        {Icon && <Icon className={cn("h-5 w-5", active ? "opacity-100" : "opacity-70")} />}
                        <span>{item.label}</span>
                      </div>
                      {item.badge ? (
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
