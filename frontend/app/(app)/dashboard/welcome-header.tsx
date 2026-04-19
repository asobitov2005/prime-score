"use client";

import { useAuthStore } from "@/store/auth-store";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layout } from "lucide-react";

export function WelcomeHeader() {
  const { name } = useAuthStore();
  const firstName = name ? name.split(" ")[0] : "Candidate";
  
  return (
    <Card className="overflow-hidden bg-background border border-border/50 relative rounded-2xl shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
      
      <CardHeader className="space-y-1 relative z-10 p-5 lg:px-6 border-b border-border/40 bg-muted/5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Welcome back, {firstName}</CardTitle>
            <CardDescription className="text-muted-foreground text-sm font-medium">
              Here is your progress and what you should focus on next.
            </CardDescription>
          </div>
          <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Layout className="h-5 w-5" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
