"use client";
import type { PromoCodesPageScope } from "./controller";
import { CardDescription, CardHeader, CardTitle, Gift, X } from "../dependencies";

export function PromoCodesPageSection16({ scope }: { scope: PromoCodesPageScope }) {
  const { submitting, setIsCreateModalOpen } = scope;
  return (
    <CardHeader className="border-b border-border/40 bg-muted/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Gift className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>Create redeem codes</CardTitle>
                        <CardDescription>Generate one custom code or a full batch with audience, validity, and usage rules.</CardDescription>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!submitting) {
                          setIsCreateModalOpen(false);
                        }
                      }}
                      className="rounded-xl border border-border/50 bg-background/70 p-2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>
  );
}
