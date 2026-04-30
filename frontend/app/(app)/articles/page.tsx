import { Newspaper, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function ArticlesPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
          <Newspaper className="h-3.5 w-3.5" />
          Articles Library
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Articles</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          This section is reserved for article-based study content, reading support material, and guidance content inside PrimeScore.
        </p>
      </div>

      <Card className="rounded-3xl border-border/60 bg-card/70 shadow-sm">
        <CardHeader className="pb-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <CardTitle className="pt-4 text-xl font-semibold text-foreground">Section Ready</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>The menu entry is live now so the app structure stays consistent.</p>
          <p>Article collections and study content can be plugged into this page next.</p>
        </CardContent>
      </Card>
    </div>
  );
}
