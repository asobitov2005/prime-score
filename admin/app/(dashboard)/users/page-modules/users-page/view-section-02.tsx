"use client";
import type { UsersPageScope } from "./controller";
import { Badge, PrimePremiumIcon, buttonClassName, cn } from "../dependencies";
import { FilterDropdown, IconChevron, IconSearch, IconX } from "../shared";

export function UsersPageSection2({ scope }: { scope: UsersPageScope }) {
  const { actionsRef, noneSelected, setActionsOpen, actionsOpen, selectedIds, grantPremium, bulkLoading, premiumFilter, setPremiumFilter, leaderboardFilter, setLeaderboardFilter, search, setSearch, setCreateOpen, hasFilters, clearFilters, filtered } = scope;
  return (
    <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm pb-4 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Actions */}
              <div className="relative" ref={actionsRef}>
                <button
                  onClick={() => !noneSelected && setActionsOpen(!actionsOpen)}
                  className={cn(
                    "h-9 pl-3 pr-2 rounded-lg border text-sm font-semibold flex items-center gap-2 transition-all",
                    noneSelected ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60" : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                  )}
                  title={noneSelected ? "Avval userlarni tanlang" : `${selectedIds.size} ta tanlangan`}
                >
                  {!noneSelected && <Badge tone="info" className="text-[10px] px-1.5 py-0">{selectedIds.size}</Badge>}
                  Actions
                  <IconChevron open={actionsOpen} />
                </button>
                {actionsOpen && !noneSelected && (
                  <div className="absolute left-0 top-full mt-1 w-52 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden py-1">
                    <button onClick={() => grantPremium(30)} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3">
                      <PrimePremiumIcon className="h-4 w-4" /> Premium 30 kun
                    </button>
                    <button onClick={() => grantPremium(7)} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3 border-t border-border/30">
                      <PrimePremiumIcon className="h-4 w-4" /> Premium 7 kun
                    </button>
                    <button onClick={() => grantPremium(10)} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3 border-t border-border/30">
                      <PrimePremiumIcon className="h-4 w-4" /> Premium 10 kun
                    </button>
                    <button onClick={() => grantPremium(90)} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3 border-t border-border/30">
                      <PrimePremiumIcon className="h-4 w-4" /> Premium 90 kun
                    </button>
                    <button onClick={() => grantPremium(365)} disabled={bulkLoading} className="w-full px-3 py-2.5 text-sm font-medium text-left hover:bg-muted transition-colors flex items-center gap-3 border-t border-border/30">
                      <PrimePremiumIcon className="h-4 w-4" /> Premium 1 yil
                    </button>
                  </div>
                )}
              </div>
    
              <div className="h-5 w-px bg-border/60 mx-1" />
    
              <FilterDropdown label="Premium" value={premiumFilter} onChange={setPremiumFilter} options={[
                { id: "all", label: "All users" },
                { id: "active", label: "Premium active" },
                { id: "expired", label: "Expired" },
                { id: "free", label: "Free" },
              ]} />
              <FilterDropdown label="Leaderboard" value={leaderboardFilter} onChange={setLeaderboardFilter} options={[
                { id: "all", label: "All" },
                { id: "visible", label: "Visible" },
                { id: "hidden", label: "Hidden" },
              ]} />
    
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2"><IconSearch /></div>
                <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-40 pl-8 pr-3 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all" />
              </div>
    
              <button
                onClick={() => setCreateOpen(true)}
                className={buttonClassName({ variant: "solid", size: "sm" })}
              >
                Add user
              </button>
    
              {hasFilters && (
                <button onClick={clearFilters} className="h-9 px-2.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1.5">
                  <IconX /> Clear
                </button>
              )}
    
              <div className="ml-auto">
                <Badge tone="neutral">{filtered.length} users</Badge>
              </div>
            </div>
          </div>
  );
}
