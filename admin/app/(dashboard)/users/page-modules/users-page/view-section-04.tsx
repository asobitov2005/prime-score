"use client";
import type { UsersPageScope } from "./controller";
import { AdminTableLoadingSkeleton, Badge, Card, CardContent, PrimePremiumIcon, SectionHeader, buttonClassName, cn, formatDate } from "../dependencies";
import { FilterDropdown, IconChevron, IconSearch, IconX } from "../shared";
import { UsersPageSection2 } from "./view-section-02";
import { UsersPageSection3 } from "./view-section-03";
import { UsersPageSection4 } from "./view-section-04";

export function UsersPageView1({ scope }: { scope: UsersPageScope }) {
  const { actionsRef, noneSelected, setActionsOpen, actionsOpen, selectedIds, grantPremium, bulkLoading, premiumFilter, setPremiumFilter, leaderboardFilter, setLeaderboardFilter, search, setSearch, setCreateOpen, hasFilters, clearFilters, filtered, bulkMsg, loadError, createMsg, createError, loading, allSelected, toggleAll, toggle, createOpen, createForm, setCreateForm, createUser, createLoading } = scope;
  return (
    (
        <div className="space-y-6">
          <SectionHeader
            eyebrow="People"
            title="Users"
            description="Search users, inspect sessions, and grant premium."
          />
    
          {/* Toolbar */}
          <UsersPageSection2 scope={scope} />
    
          {bulkMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 text-sm font-medium text-emerald-600">{bulkMsg}</div>
          )}
    
          {loadError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">{loadError}</div>
          )}
    
          {createMsg && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600">{createMsg}</div>
          )}
          {createError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">{createError}</div>
          )}
    
          {/* Table */}
          <UsersPageSection3 scope={scope} />
    
          <UsersPageSection4 scope={scope} />
        </div>
      )
  );
}
