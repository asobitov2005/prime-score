"use client";
import type { PromoCodesPageScope } from "./controller";
import { Input, Search, Select } from "../dependencies";
import { GiftCodeRow } from "../shared";

export function PromoCodesPageSection10({ scope }: { scope: PromoCodesPageScope }) {
  const { search, setSearch, statusFilter, setStatusFilter, planFilter, setPlanFilter, plans } = scope;
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_220px_220px]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search code, plan, or recipient"
                      className="pl-9"
                    />
                  </div>
    
                  <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as GiftCodeRow["status"] | "all")}>
                    <option value="all">All statuses</option>
                    <option value="available">Available</option>
                    <option value="paused">Paused</option>
                    <option value="redeemed">Redeemed</option>
                    <option value="expired">Expired</option>
                    <option value="revoked">Revoked</option>
                  </Select>
    
                  <Select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}>
                    <option value="all">All plans</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </Select>
                </div>
  );
}
