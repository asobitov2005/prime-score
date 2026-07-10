"use client";
import type { PromoCodesPageScope } from "./controller";
import { Input } from "../dependencies";
import { normalizeCodeInput } from "../shared";

export function PromoCodesPageSection23({ scope }: { scope: PromoCodesPageScope }) {
  const { customCode, setCustomCode, quantityNumber } = scope;
  return (
    <div>
                          <label className="mb-2 block text-sm font-medium text-foreground">Custom single code</label>
                          <Input
                            value={customCode}
                            onChange={(event) => setCustomCode(normalizeCodeInput(event.target.value))}
                            placeholder="PRIME-30DAY"
                            disabled={quantityNumber !== 1}
                          />
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Available only when quantity is 1. For batches, unique random suffixes are generated automatically.
                          </p>
                        </div>
  );
}
