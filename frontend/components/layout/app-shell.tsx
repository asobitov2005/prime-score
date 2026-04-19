"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpenText, Gauge, History, Medal, Menu, ShieldAlert, X, Home, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";

interface AppShellProps {
  children: ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/tests", label: "Tests", icon: BookOpenText },
  { href: "/history", label: "History", icon: History },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal },
  { href: "/subscription", label: "Subscription", icon: ShieldAlert },
  { href: "/settings", label: "Settings", icon: Settings2 }
] as const;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebar, toggleSidebar } = useUIStore();
  const { isAuthenticated } = useAuthStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // If user is not authenticated and tries to access protected app routes (except /tests which might be open partially but app-shell wraps it)
    // Actually, the user requested: if not logged in, only /tests is open. If they go to others, prompt to login.
    if (!isAuthenticated && pathname !== "/tests" && !pathname.startsWith("/tests/")) {
      router.push("/login");
    }
  }, [isAuthenticated, pathname, router]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileOpen]);

  // If not authenticated and trying to view a protected page, show nothing while redirecting
  if (!isAuthenticated && pathname !== "/tests" && !pathname.startsWith("/tests/")) {
    return null;
  }

  const SidebarContent = () => (
    <>
      <Card className="p-3 border-border/50 shadow-sm bg-card/60 backdrop-blur-md rounded-xl">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 pl-2">Main Menu</p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                  active 
                    ? "bg-primary text-background shadow-sm" 
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground active:scale-95"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "opacity-100" : "opacity-70")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </Card>

      <Card className="p-4 border-border/50 shadow-sm bg-card/60 backdrop-blur-md rounded-xl">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Account Status</p>
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between group">
            <span className="font-semibold text-muted-foreground transition-colors group-hover:text-foreground">Sessions</span>
            <Badge variant="outline" className="font-bold text-[10px] py-0 px-2 h-5">2 / 2</Badge>
          </div>
          <div className="flex items-center justify-between group">
            <span className="font-semibold text-muted-foreground transition-colors group-hover:text-foreground">Premium</span>
            <Badge variant="secondary" className="font-bold uppercase text-[9px] py-0 px-2 h-5 text-amber-600 bg-amber-500/10 hover:bg-amber-500/20">Paused</Badge>
          </div>
        </div>
      </Card>
    </>
  );

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 flex flex-col lg:flex-row gap-6 md:gap-8 items-start relative">
      {/* Mobile Sidebar Toggle Button - Floating because header is global */}
      <Button 
        variant="outline" 
        size="icon" 
        onClick={() => setIsMobileOpen(true)} 
        className="lg:hidden fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-primary text-background shadow-xl border-none hover:bg-primary/90 active:scale-95"
        aria-label="Open Menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-background border-r border-border/50 shadow-2xl p-5 flex flex-col gap-5 lg:hidden transition-transform duration-300 ease-out",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between pb-2 border-b border-border/30">
          <p className="font-bold text-base text-foreground">Menu</p>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)} className="h-8 w-8 rounded-full hover:bg-muted/50 -mr-2">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 pb-6 no-scrollbar">
           <SidebarContent />
        </div>
      </div>

      <aside className={cn(
        "hidden lg:block w-64 shrink-0 transition-all duration-300 sticky top-32", 
        sidebar === "collapsed" ? "lg:hidden" : "lg:block"
      )}>
        <div className="space-y-4">
          <SidebarContent />
        </div>
      </aside>

      <main className="flex-1 min-w-0 w-full animate-in fade-in duration-500 ease-out">
        {children}
      </main>
    </div>
  );
}
