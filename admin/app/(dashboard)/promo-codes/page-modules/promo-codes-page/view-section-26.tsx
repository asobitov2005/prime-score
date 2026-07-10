"use client";
import type { PromoCodesPageScope } from "./controller";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select } from "../dependencies";
import { DateTimePickerField, GiftCodeRow, addDaysToDateTimeInputValue, addMinutesToDateTimeInputValue, formatDateTimeEntryLabel, formatPrice, normalizeCodeInput, normalizePrefix, targetUserLabel } from "../shared";
import { PromoCodesPageSection20 } from "./view-section-25";
import { PromoCodesPageSection26 } from "./view-section-26";

export function PromoCodesPageSection19({ scope }: { scope: PromoCodesPageScope }) {
  const { selectedPlanId, setSelectedPlanId, activePlans, quantity, setQuantity, customCode, setCustomCode, prefix, setPrefix, quantityNumber, startDate, setStartDate, currentDateTimeInputValue, endDate, setEndDate, effectiveStartDate, selectedPlan, maxUses, setMaxUses, maxUsesNumber, perUserLimit, setPerUserLimit, targetUserType, setTargetUserType, startsPaused, setStartsPaused, previewCode, perUserLimitNumber } = scope;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
                      <PromoCodesPageSection20 scope={scope} />
    
                      <PromoCodesPageSection26 scope={scope} />
                    </div>
  );
}
