"use client";

import { useAuthStore } from "@/store/auth-store";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layout, Crown, Sparkles } from "lucide-react";

export function WelcomeHeader() {
  const { name, isPremium } = useAuthStore();
  const firstName = name ? name.split(" ")[0] : "Candidate";
  
  return (
    <Card className="overflow-hidden bg-background border border-border/50 relative rounded-2xl shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
      
      <CardHeader className="space-y-1 relative z-10 p-5 lg:px-6 border-b border-border/40 bg-muted/5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Welcome back, {firstName}</CardTitle>
              {isPremium && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                  <Crown className="h-3.5 w-3.5" />
                  Premium
                  <Sparkles className="h-3 w-3 opacity-80" />
                </div>
              )}
            </div>
            <CardDescription className="text-muted-foreground text-sm font-medium">
              {isPremium
                ? "Your premium dashboard is ready with deeper access and a cleaner prep view."
                : "Here is your progress and what you should focus on next."}
            </CardDescription>
          </div>
          <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            {isPremium ? <Crown className="h-5 w-5" /> : <Layout className="h-5 w-5" />}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
