"use client";
import type { PromoCodesPageScope } from "./controller";
import { Button, Input, Select } from "../dependencies";
import { DateTimePickerField, GiftCodeRow, addDaysToDateTimeInputValue, addMinutesToDateTimeInputValue, formatPrice, normalizeCodeInput, normalizePrefix } from "../shared";
import { PromoCodesPageSection21 } from "./view-section-21";
import { PromoCodesPageSection22 } from "./view-section-22";
import { PromoCodesPageSection23 } from "./view-section-23";
import { PromoCodesPageSection24 } from "./view-section-24";
import { PromoCodesPageSection25 } from "./view-section-25";

export function PromoCodesPageSection20({ scope }: { scope: PromoCodesPageScope }) {
  const { selectedPlanId, setSelectedPlanId, activePlans, quantity, setQuantity, customCode, setCustomCode, prefix, setPrefix, quantityNumber, startDate, setStartDate, currentDateTimeInputValue, endDate, setEndDate, effectiveStartDate, selectedPlan, maxUses, setMaxUses, maxUsesNumber, perUserLimit, setPerUserLimit, targetUserType, setTargetUserType } = scope;
  return (
    <div className="space-y-5">
                        <PromoCodesPageSection21 scope={scope} />
    
                        <PromoCodesPageSection22 scope={scope} />
    
                        <PromoCodesPageSection23 scope={scope} />
    
                        <PromoCodesPageSection24 scope={scope} />
    
                        <PromoCodesPageSection25 scope={scope} />
    
                        <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">Target user type</label>
                          <Select value={targetUserType} onChange={(event) => setTargetUserType(event.target.value as GiftCodeRow["target_user_type"])}>
                            <option value="all">All users</option>
                            <option value="premium">Premium users</option>
                            <option value="free">Free users</option>
                          </Select>
                        </div>
                      </div>
  );
}
