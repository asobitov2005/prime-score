"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Gift, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError, createApiClient } from "@/lib/api/client";
import { copyTextToClipboard } from "@/lib/clipboard";
import { mapGiftSummary } from "@/lib/gift-code-mappers";
import type { UserGiftCodeRecord, UserGiftCodeSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusBadgeClassName(status: UserGiftCodeRecord["status"]): string {
  if (status === "redeemed") {
    return "border-border bg-muted text-muted-foreground";
  }
  if (status === "available") {
    return "border-border bg-muted text-primary";
  }
  if (status === "expired" || status === "revoked") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200";
  }
  return "border-border bg-muted text-muted-foreground";
}

interface GiftCodeGeneratorCardProps {
  initialSummary: UserGiftCodeSummary;
}

export function GiftCodeGeneratorCard({ initialSummary }: GiftCodeGeneratorCardProps) {
  const api = useMemo(() => createApiClient(), []);
  const [summary, setSummary] = useState(initialSummary);
  const [busyGiftDays, setBusyGiftDays] = useState<number | null>(null);
  const [generatedCode, setGeneratedCode] = useState<UserGiftCodeRecord | null>(
    () => summary.recentCodes.find((item) => item.status === "available") ?? null,
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibleRecentCodes = summary.recentCodes.slice(0, 5);

  async function handleGenerate(giftDays: number) {
    setBusyGiftDays(giftDays);
    setCopied(false);
    setError(null);

    try {
      const response = await api.generateGiftCode({ gift_days: giftDays });
      setGeneratedCode({
        id: response.gift_code.id,
        code: response.gift_code.code,
        durationDays: response.gift_code.duration_days,
        status: response.gift_code.status,
        expiresAt: response.gift_code.expires_at ?? null,
        redeemedAt: response.gift_code.redeemed_at ?? null,
        createdAt: response.gift_code.created_at ?? null,
      });
      setSummary(mapGiftSummary(response.summary));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Gift code could not be generated.");
    } finally {
      setBusyGiftDays(null);
    }
  }

  async function handleCopy(code: string) {
    try {
      await copyTextToClipboard(code);
      setCopied(true);
      setError(null);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard copy failed. Copy the code manually.");
    }
  }

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
          Gift Premium to a friend
        </h2>
        <p className="text-sm font-medium text-muted-foreground">
          Generate a code and share premium access with someone.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[18px] border border-border bg-card p-4 shadow-none">
          {summary.items.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl bg-muted p-8 text-center">
              <Gift className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">No gift credits available right now.</p>
              <p className="mt-1 max-w-sm text-xs font-medium text-muted-foreground">
                Eligible premium plans unlock friend gift credits here after premium is activated.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.items.map((item) => (
                <div key={item.giftDays} className="flex min-h-44 flex-col justify-between gap-5 rounded-2xl border border-border bg-muted p-4 text-center transition-colors hover:bg-muted">
                  <div className="flex flex-col items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary ring-1 ring-border">
                      <Gift className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{item.giftDays} Days Premium</h3>
                      <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                        {item.availableCount} of {item.totalCount} left
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className={cn(
                      "h-10 w-full rounded-xl px-5 text-sm font-semibold shadow-sm",
                      item.availableCount > 0
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-muted-foreground hover:bg-muted",
                    )}
                    disabled={item.availableCount <= 0 || busyGiftDays === item.giftDays}
                    onClick={() => void handleGenerate(item.giftDays)}
                  >
                    {busyGiftDays === item.giftDays ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                    {busyGiftDays === item.giftDays ? "Generating..." : item.availableCount > 0 ? "Generate Code" : "Out of stock"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[18px] border border-border bg-muted p-5 shadow-none">
          {generatedCode ? (
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                    <Check className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold">Generated successfully</h3>
                </div>
                <p className="mt-5 break-all font-mono text-2xl font-bold tracking-[0.08em] text-muted-foreground">
                  {generatedCode.code}
                </p>
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  Valid for {generatedCode.durationDays} days. Each code works once.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-border bg-card px-5 text-sm font-semibold text-muted-foreground hover:bg-muted"
                  onClick={() => void handleCopy(generatedCode.code)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy Code"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
              <Gift className="mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground">Generated code will appear here</h3>
              <p className="mt-1 max-w-xs text-sm font-medium text-muted-foreground">
                Pick an available gift option to create a one-time premium code.
              </p>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="space-y-4 pt-2">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Gift code history</h2>
            <p className="text-sm font-medium text-muted-foreground">
              View your previously generated gift codes.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-border bg-card shadow-none">
          {visibleRecentCodes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] table-auto text-left text-sm">
                <thead className="border-b border-border bg-muted text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="w-16 px-3 py-3 text-center">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border ">
                  {visibleRecentCodes.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-muted">
                      <td className="px-4 py-4 font-mono text-sm font-semibold tracking-[0.06em] text-foreground">{item.code}</td>
                      <td className="px-4 py-4 font-medium text-muted-foreground">{item.durationDays} Days</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]", statusBadgeClassName(item.status))}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 font-medium text-muted-foreground">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-4 font-medium text-muted-foreground">{formatDate(item.expiresAt)}</td>
                      <td className="w-16 px-3 py-4 text-center">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => void handleCopy(item.code)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-foreground">No gift code history yet.</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Generated gift codes will be listed here.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
