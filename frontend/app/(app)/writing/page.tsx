import { PenSquare, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function WritingPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
          <PenSquare className="h-3.5 w-3.5" />
          Writing Workspace
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Writing</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Writing section is being prepared for the main PrimeScore workflow. This area is reserved so the navigation is ready when the full feature lands.
        </p>
      </div>

      <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <CardTitle className="pt-4 text-xl font-semibold text-foreground">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Once enabled, this section will host Writing tasks, prompts, and evaluation flow.</p>
          <p>The menu item is live now so the layout stays consistent with the planned product structure.</p>
        </CardContent>
      </Card>
    </div>
  );
}
