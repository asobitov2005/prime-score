"use client";
import type { PromoCodesPageScope } from "./controller";
import { Input } from "../dependencies";
import { normalizePrefix } from "../shared";

export function PromoCodesPageSection22({ scope }: { scope: PromoCodesPageScope }) {
  const { quantity, setQuantity, customCode, setCustomCode, prefix, setPrefix } = scope;
  return (
    <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-foreground">Quantity</label>
                            <Input
                              type="number"
                              min={1}
                              max={50}
                              value={quantity}
                              onChange={(event) => {
                                const next = event.target.value;
                                setQuantity(next);
                                if ((Number.parseInt(next || "1", 10) || 1) > 1 && customCode) {
                                  setCustomCode("");
                                }
                              }}
                            />
                          </div>
    
                          <div>
                            <label className="mb-2 block text-sm font-medium text-foreground">Prefix</label>
                            <Input
                              value={prefix}
                              onChange={(event) => setPrefix(normalizePrefix(event.target.value))}
                              placeholder="PRIME"
                              maxLength={12}
                            />
                          </div>
                        </div>
  );
}
