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
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200";
  }
  if (status === "available") {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200";
  }
  if (status === "expired" || status === "revoked") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200";
  }
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
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
        <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">
          Gift Premium to a friend
        </h2>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Generate a code and share premium access with someone.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/75">
          {summary.items.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl bg-slate-50 p-8 text-center dark:bg-slate-950/35">
              <Gift className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No gift credits available right now.</p>
              <p className="mt-1 max-w-sm text-xs font-medium text-slate-500 dark:text-slate-400">
                Eligible premium plans unlock friend gift credits here after premium is activated.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.items.map((item) => (
                <div key={item.giftDays} className="flex min-h-44 flex-col justify-between gap-5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/35 dark:hover:bg-slate-950/50">
                  <div className="flex flex-col items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-1 ring-orange-100 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-500/20">
                      <Gift className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-slate-950 dark:text-white">{item.giftDays} Days Premium</h3>
                      <p className="mt-0.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                        {item.availableCount} of {item.totalCount} left
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    className={cn(
                      "h-10 w-full rounded-xl px-5 text-sm font-semibold shadow-sm",
                      item.availableCount > 0
                        ? "bg-orange-500 text-white hover:bg-orange-600"
                        : "bg-slate-100 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500",
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

        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50/80 p-5 shadow-[0_18px_42px_-34px_rgba(16,185,129,0.45)] dark:border-emerald-500/20 dark:bg-emerald-500/10">
          {generatedCode ? (
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                    <Check className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold">Generated successfully</h3>
                </div>
                <p className="mt-5 break-all font-mono text-2xl font-bold tracking-[0.08em] text-emerald-950 dark:text-emerald-50">
                  {generatedCode.code}
                </p>
                <p className="mt-3 text-sm font-medium text-emerald-700/80 dark:text-emerald-200/75">
                  Valid for {generatedCode.durationDays} days. Each code works once.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl border-emerald-200 bg-white px-5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:bg-slate-950/35 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
                  onClick={() => void handleCopy(generatedCode.code)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy Code"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-56 flex-col items-center justify-center text-center">
              <Gift className="mb-3 h-8 w-8 text-emerald-600/40" />
              <h3 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">Generated code will appear here</h3>
              <p className="mt-1 max-w-xs text-sm font-medium text-emerald-700/75 dark:text-emerald-200/70">
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
            <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">Gift code history</h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              View your previously generated gift codes.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_42px_-34px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-900/75">
          {visibleRecentCodes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] table-auto text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:border-slate-800 dark:bg-slate-950/35 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="w-16 px-3 py-3 text-center">Copy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleRecentCodes.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/75 dark:hover:bg-slate-950/25">
                      <td className="px-4 py-4 font-mono text-sm font-semibold tracking-[0.06em] text-slate-950 dark:text-white">{item.code}</td>
                      <td className="px-4 py-4 font-medium text-slate-600 dark:text-slate-300">{item.durationDays} Days</td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]", statusBadgeClassName(item.status))}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-600 dark:text-slate-300">{formatDate(item.createdAt)}</td>
                      <td className="px-4 py-4 font-medium text-slate-600 dark:text-slate-300">{formatDate(item.expiresAt)}</td>
                      <td className="w-16 px-3 py-4 text-center">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" onClick={() => void handleCopy(item.code)}>
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
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No gift code history yet.</p>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">Generated gift codes will be listed here.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
