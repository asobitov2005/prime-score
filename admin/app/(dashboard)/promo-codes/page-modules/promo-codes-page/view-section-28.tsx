"use client";
import type { PromoCodesPageScope } from "./controller";
import { Badge, Ban, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, CheckCircle2, Clock3, Copy, Gift, Input, Notice, PauseCircle, PlayCircle, RefreshCw, Search, SectionHeader, Select, Sparkles, Ticket, X, cn } from "../dependencies";
import { DateTimePickerField, GiftCodeRow, MetricCard, addDaysToDateTimeInputValue, addMinutesToDateTimeInputValue, formatDateTime, formatDateTimeEntryLabel, formatPrice, normalizeCodeInput, normalizePrefix, statusLabel, statusTone, targetUserLabel } from "../shared";
import { PromoCodesPageSection2 } from "./view-section-02";
import { PromoCodesPageSection3 } from "./view-section-03";
import { PromoCodesPageSection4 } from "./view-section-04";
import { PromoCodesPageSection5 } from "./view-section-11";
import { PromoCodesPageSection12 } from "./view-section-27";
import { PromoCodesPageSection28 } from "./view-section-28";

export function PromoCodesPageView1({ scope }: { scope: PromoCodesPageScope }) {
  const { setIsCreateModalOpen, loadPage, refreshing, metrics, error, recentBatch, handleCopyBatch, handleCopy, filteredCodes, codes, search, setSearch, statusFilter, setStatusFilter, planFilter, setPlanFilter, plans, rowActionId, handleStatusChange, isCreateModalOpen, submitting, handleCreate, selectedPlanId, setSelectedPlanId, activePlans, quantity, setQuantity, customCode, setCustomCode, prefix, setPrefix, quantityNumber, startDate, setStartDate, currentDateTimeInputValue, endDate, setEndDate, effectiveStartDate, selectedPlan, maxUses, setMaxUses, maxUsesNumber, perUserLimit, setPerUserLimit, targetUserType, setTargetUserType, startsPaused, setStartsPaused, previewCode, perUserLimitNumber, message, toastVisible, toastPosition } = scope;
  return (
    (
        <div className="space-y-8 pb-10 animate-in fade-in duration-500">
          <PromoCodesPageSection2 scope={scope} />
    
          <PromoCodesPageSection3 scope={scope} />
    
          <PromoCodesPageSection4 scope={scope} />
    
          <PromoCodesPageSection5 scope={scope} />
    
          <PromoCodesPageSection12 scope={scope} />
    
          <PromoCodesPageSection28 scope={scope} />
        </div>
      )
  );
}
