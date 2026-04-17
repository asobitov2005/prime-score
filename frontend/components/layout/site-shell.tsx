"use client";

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";
import { ArrowRight, Headphones, LayoutDashboard, Radar, ShieldCheck, Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SiteShellProps {
  children: ReactNode;
}

const highlights = [
  "Telegram-only auth",
  "Strict IELTS scoring",
  "Reading + Listening only"
];

export function SiteShell({ children }: SiteShellProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // In a real app, this would use next-themes, but for now we'll simulate the toggle UI
  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
    // This typically toggles a class on the html element
    document.documentElement.classList.toggle("light");
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20 selection:text-primary">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl shadow-sm transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8 h-28 md:h-36">
          <Link href="/" className="flex items-center gap-2 group focus-visible:outline-none rounded-xl">
            <div className="h-20 md:h-28 transition-transform duration-300 group-hover:scale-105">
              <img src="/logo.svg" alt="PrimeScore" className="h-full w-auto object-contain" />
            </div>
          </Link>

          <nav className="hidden items-center gap-10 md:flex ml-auto mr-8">
            <NavLink href="/" label="Home" />
            <NavLink href="/tests" label="Mock Tests" />
            <NavLink href="/dashboard" label="How It Works" />
            <NavLink href="/leaderboard" label="Leaderboard" />
          </nav>

          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="h-12 w-12 rounded-2xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
              title="Toggle Light/Dark Mode"
            >
              {theme === "dark" ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </Button>
            
            <Button asChild size="lg" className="rounded-2xl h-12 px-8 text-base font-black shadow-lg shadow-primary/20 hover:shadow-xl transition-all hover:-translate-y-0.5 bg-primary text-background border-none">
              <Link href="/login" className="inline-flex items-center gap-2">
                Login
                <ArrowRight className="h-5 w-5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/50 bg-muted/10">
        <div className="w-full mx-auto px-4 py-12 md:px-8 xl:px-12 text-sm text-muted-foreground">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {highlights.map((item) => (
              <Card key={item} className="bg-transparent border-none shadow-none group">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-primary/10 p-3 text-primary shadow-sm ring-1 ring-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/15">
                    {item.includes("auth") ? <ShieldCheck className="h-5 w-5" /> : item.includes("Leaderboard") ? <Radar className="h-5 w-5" /> : item.includes("Reading") ? <LayoutDashboard className="h-5 w-5" /> : <Headphones className="h-5 w-5" />}
                  </div>
                  <p className="font-bold text-foreground text-base">{item}</p>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-16 flex items-center justify-center border-t border-border/40 pt-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">© 2026 PrimeScore. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-xl px-4 py-2 text-[17px] font-black text-muted-foreground/80 transition-all hover:text-foreground hover:bg-muted/30 active:scale-95"
      )}
    >
      {label}
    </Link>
  );
}
