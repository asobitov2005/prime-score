"use client";
import type { SettingsPageScope } from "./controller";
import { CardDescription, CardHeader, CardTitle, Settings2 } from "../dependencies";

export function SettingsPageSection4({ scope }: { scope: SettingsPageScope }) {
  return (
    <CardHeader className="space-y-1 relative z-10 p-4 lg:px-5 border-b border-border/40 bg-muted/5">
              <div className="flex items-start gap-4">
                <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{"Account Settings"}</CardTitle>
                  <CardDescription className="text-muted-foreground text-sm font-medium">
                    {"Manage your profile, preferences, and active sessions."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
  );
}
