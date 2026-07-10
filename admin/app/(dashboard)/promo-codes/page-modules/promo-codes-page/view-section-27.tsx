"use client";
import type { PromoCodesPageScope } from "./controller";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Gift, Input, Select, Sparkles, X, cn } from "../dependencies";
import { DateTimePickerField, GiftCodeRow, addDaysToDateTimeInputValue, addMinutesToDateTimeInputValue, formatDateTimeEntryLabel, formatPrice, normalizeCodeInput, normalizePrefix, targetUserLabel } from "../shared";
import { PromoCodesPageSection13 } from "./view-section-27";

export function PromoCodesPageSection12({ scope }: { scope: PromoCodesPageScope }) {
  const { isCreateModalOpen, submitting, setIsCreateModalOpen, handleCreate, selectedPlanId, setSelectedPlanId, activePlans, quantity, setQuantity, customCode, setCustomCode, prefix, setPrefix, quantityNumber, startDate, setStartDate, currentDateTimeInputValue, endDate, setEndDate, effectiveStartDate, selectedPlan, maxUses, setMaxUses, maxUsesNumber, perUserLimit, setPerUserLimit, targetUserType, setTargetUserType, startsPaused, setStartsPaused, previewCode, perUserLimitNumber } = scope;
  return (
    {isCreateModalOpen ? <PromoCodesPageSection13 scope={scope} /> : null}
  );
}
