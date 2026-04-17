"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BookOpenText, Gauge, History, Medal, Menu, ShieldAlert, Sparkles, X, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";

interface AppShellProps {
  children: ReactNode;
}

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/tests", label: "Tests", icon: BookOpenText },
  { href: "/history", label: "History", icon: History },
  { href: "/leaderboard", label: "Leaderboard", icon: Medal },
  { href: "/subscription", label: "Subscription", icon: ShieldAlert }
] as const;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { sidebar, toggleSidebar } = useUIStore();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileOpen]);

  const SidebarContent = () => (
    <>
      <Card className="p-4 border-border/50 shadow-sm bg-card/60 backdrop-blur-md rounded-2xl animate-in fade-in slide-in-from-left-4 duration-500">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4 pl-2">Main Menu</p>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3.5 rounded-xl px-4 py-3 text-[15px] font-semibold transition-all duration-200",
                  active 
                    ? "bg-primary text-background shadow-md md:translate-x-1" 
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground md:hover:translate-x-1 active:scale-95"
                )}
              >                <Icon className={cn("h-5 w-5", active ? "opacity-100" : "opacity-70")} />
                {item.label}
              </Link>
            );          })}
        </nav>
      </Card>

      <Card className="p-5 border-border/50 shadow-sm bg-card/60 backdrop-blur-md rounded-2xl animate-in fade-in slide-in-from-left-8 duration-700">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">Account Status</p>
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between group">
            <span className="font-semibold text-muted-foreground transition-colors group-hover:text-foreground">Sessions</span>
            <Badge tone="outline" className="font-bold">2 / 2</Badge>
          </div>
          <div className="flex items-center justify-between group">
            <span className="font-semibold text-muted-foreground transition-colors group-hover:text-foreground">Premium</span>
            <Badge tone="paused" className="font-bold uppercase">Paused</Badge>
          </div>
        </div>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl shadow-sm transition-all">
        <div className="w-full flex items-center justify-between gap-4 px-4 py-3 md:px-8 xl:px-12 h-28 md:h-36">
          <Link href="/dashboard" className="flex items-center gap-2 group focus-visible:outline-none rounded-xl">
            <div className="h-20 md:h-28 transition-transform duration-300 group-hover:scale-105">
              <img src="/logo.svg" alt="PrimeScore" className="h-full w-auto object-contain" />
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsMobileOpen(true)} 
              className="lg:hidden h-10 w-10 md:h-12 md:w-12 rounded-xl bg-muted/30 border-border/50 hover:bg-muted/80 active:scale-95 transition-transform"
              aria-label="Open Menu"
            >
              <Menu className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Panel */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-[85%] sm:w-80 bg-background border-r border-border/50 shadow-2xl p-6 flex flex-col gap-6 lg:hidden transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between pb-2 border-b border-border/30">
          <p className="font-black text-lg tracking-tight text-foreground">Menu</p>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)} className="rounded-full hover:bg-muted/50 -mr-2">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-6 pb-10 no-scrollbar">
           <SidebarContent />
        </div>
      </div>

      <div className="flex-1 w-full flex flex-col lg:flex-row px-4 py-6 md:px-8 xl:px-12 gap-6 lg:gap-8 max-w-[1920px] mx-auto">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "hidden lg:block lg:w-64 xl:w-[300px] flex-shrink-0 space-y-6 transition-all duration-300", 
          sidebar === "collapsed" ? "lg:hidden" : "lg:block"
        )}>
          <div className="sticky top-[100px] space-y-6">
            <SidebarContent />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 pb-20 w-full animate-in fade-in zoom-in-[0.98] duration-500 ease-out">
          <div className="w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
