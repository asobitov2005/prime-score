"use client";
import type { UserDetailPageScope } from "./controller";
import { Card, CardContent, buttonClassName } from "../dependencies";
import { IconBan, IconChevron, IconCrown, IconEye, IconEyeOff, IconTrash } from "../shared";

export function UserDetailPageSection7({ scope }: { scope: UserDetailPageScope }) {
  const { premiumRef, setPremiumOpen, premiumOpen, actionLoading, grantPremium, user, revokePremium, toggleLeaderboard, deleteUser } = scope;
  return (
    <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="relative" ref={premiumRef}>
                <button
                  onClick={() => setPremiumOpen(!premiumOpen)}
                  disabled={actionLoading}
                  className={buttonClassName({ variant: "solid", size: "sm" })}
                >
                  <span className="inline-flex items-center gap-2">
                    <IconCrown />
                    Grant premium
                  </span>
                  <IconChevron open={premiumOpen} />
                </button>
                {premiumOpen && (
                  <div className="absolute left-0 top-full mt-1 w-48 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
                    <button onClick={() => grantPremium(7)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors">7 days</button>
                    <button onClick={() => grantPremium(10)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">10 days</button>
                    <button onClick={() => grantPremium(30)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">30 days</button>
                    <button onClick={() => grantPremium(90)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">90 days</button>
                    <button onClick={() => grantPremium(180)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">180 days</button>
                    <button onClick={() => grantPremium(365)} className="w-full px-4 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors border-t border-border/30">1 year</button>
                  </div>
                )}
              </div>
    
              {user.is_premium && (
                <button onClick={revokePremium} disabled={actionLoading} className={buttonClassName({ variant: "danger", size: "sm" })}>
                  <span className="inline-flex items-center gap-2">
                    <IconBan />
                    Revoke premium
                  </span>
                </button>
              )}
    
              <button onClick={toggleLeaderboard} disabled={actionLoading} className={buttonClassName({ variant: "outline", size: "sm" })}>
                <span className="inline-flex items-center gap-2">
                  {user.show_on_leaderboard ? <IconEyeOff /> : <IconEye />}
                  {user.show_on_leaderboard ? "Hide from leaderboard" : "Show on leaderboard"}
                </span>
              </button>
    
              <button onClick={deleteUser} disabled={actionLoading} className={buttonClassName({ variant: "danger", size: "sm" })}>
                <span className="inline-flex items-center gap-2">
                  <IconTrash />
                  Delete user
                </span>
              </button>
            </CardContent>
          </Card>
  );
}
