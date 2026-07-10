"use client";
import type { PromoCodesPageScope } from "./controller";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Copy } from "../dependencies";

export function PromoCodesPageSection6({ scope }: { scope: PromoCodesPageScope }) {
  const { recentBatch, handleCopyBatch, handleCopy } = scope;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)]">
              {recentBatch.length > 0 ? (
                <Card className="border-primary/20 bg-primary/5 shadow-sm">
                  <CardHeader className="border-b border-primary/10">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle>Latest generated batch</CardTitle>
                        <CardDescription>Copy these codes now and share them with the intended users.</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={(event) => void handleCopyBatch(event)}>
                        <Copy className="h-4 w-4" />
                        Copy all
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 pt-6 md:grid-cols-2 xl:grid-cols-3">
                    {recentBatch.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/80 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold tracking-[0.04em] text-foreground">{item.code}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{item.plan_name} · {item.max_uses} total use{item.max_uses === 1 ? "" : "s"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => void handleCopy(event, item.code)}
                          className="rounded-lg border border-border/50 bg-muted/20 p-2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <div />
              )}
            </div>
  );
}
