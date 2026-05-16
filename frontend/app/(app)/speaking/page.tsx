import { Mic2 } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default function SpeakingPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
          <Mic2 className="h-3.5 w-3.5" />
          Speaking Workspace
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Speaking</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Speaking flow is reserved in the app structure and will be enabled when the full interactive experience is ready.
        </p>
      </div>

      <EmptyState
        icon="mic"
        title="We are working on it!"
        description="Speaking practice is not available yet. We will enable prompts, timers, and evaluation when the full flow is ready."
        action={{ href: "/tests", label: "Practice Reading or Listening" }}
        secondaryAction={{ href: "/writing", label: "Practice Writing" }}
      />
    </div>
  );
}
