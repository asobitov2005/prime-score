"use client";
import type { PromoCodesPageScope } from "./controller";
import { Badge, Ban, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, CheckCircle2, Clock3, Copy, Input, PauseCircle, PlayCircle, Search, Select, Ticket } from "../dependencies";
import { GiftCodeRow, formatDateTime, statusLabel, statusTone, targetUserLabel } from "../shared";
import { PromoCodesPageSection6 } from "./view-section-06";
import { PromoCodesPageSection7 } from "./view-section-11";

export function PromoCodesPageSection5({ scope }: { scope: PromoCodesPageScope }) {
  const { recentBatch, handleCopyBatch, handleCopy, filteredCodes, codes, search, setSearch, statusFilter, setStatusFilter, planFilter, setPlanFilter, plans, rowActionId, handleStatusChange } = scope;
  return (
    <div className="space-y-6">
            <PromoCodesPageSection6 scope={scope} />
    
            <PromoCodesPageSection7 scope={scope} />
          </div>
  );
}
