"use client";
import type { SiteShellScope } from "./controller";
import { BookOpen, Button, CalendarDays, Dialog, Link, PrimePremiumIcon } from "../dependencies";

export function SiteShellSection3({ scope }: { scope: SiteShellScope }) {
  const { welcomeBonusVisible, showWelcomeBonusModal, welcomeBonusDays, closeWelcomeBonusModal } = scope;
  return (
    {welcomeBonusVisible && showWelcomeBonusModal ? (
            <Dialog
              open={showWelcomeBonusModal}
              onOpenChange={() => undefined}
              title="Welcome bonus activated"
              description="Your 1-day premium is active, and a 2-day bonus is waiting for you."
              className="max-w-2xl border-amber-500/20 bg-background/95 shadow-[0_30px_90px_-20px_rgba(245,158,11,0.35)]"
              dismissible={false}
            >
              <div className="space-y-5">
                <div className="rounded-lg border border-amber-500/20 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-background text-amber-600">
                      <PrimePremiumIcon className="h-12 w-12" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-amber-500">Premium unlocked</p>
                      <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                        +{welcomeBonusDays} day{welcomeBonusDays === 1 ? "" : "s"} of premium
                      </h3>
                      <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                        Complete a Full Test in Reading or Listening to earn 2 more premium days.
                      </p>
                    </div>
                  </div>
                </div>
    
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-3">
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Premium today</p>
                        <p className="text-xs text-muted-foreground">Your access is active now.</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Next bonus</p>
                        <p className="text-xs text-muted-foreground">Finish a Full Test in Reading or Listening and get +2 days.</p>
                      </div>
                    </div>
                  </div>
                </div>
    
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-11 flex-1 rounded-lg bg-amber-500 font-semibold text-black hover:bg-amber-400">
                    <Link href="/tests?type=reading" onClick={closeWelcomeBonusModal}>
                      {"Start Reading"}
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 flex-1 rounded-lg"
                    onClick={closeWelcomeBonusModal}
                  >
                    {"Continue"}
                  </Button>
                </div>
              </div>
            </Dialog>
          ) : null}
  );
}
