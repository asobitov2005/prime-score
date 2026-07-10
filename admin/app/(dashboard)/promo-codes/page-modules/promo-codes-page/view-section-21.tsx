"use client";
import type { PromoCodesPageScope } from "./controller";
import { Select } from "../dependencies";
import { formatPrice } from "../shared";

export function PromoCodesPageSection21({ scope }: { scope: PromoCodesPageScope }) {
  const { selectedPlanId, setSelectedPlanId, activePlans } = scope;
  return (
    <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">Premium plan</label>
                          <Select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)}>
                            {activePlans.length === 0 ? <option value="">No plans available</option> : null}
                            {activePlans.map((plan) => (
                              <option key={plan.id} value={plan.id}>
                                {plan.name} · {plan.duration_days} days · {formatPrice(plan.price)}
                              </option>
                            ))}
                          </Select>
                        </div>
  );
}
