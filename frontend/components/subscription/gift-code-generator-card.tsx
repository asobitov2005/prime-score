"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Gift, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function statusTone(status: UserGiftCodeRecord["status"]): "default" | "secondary" | "danger" | "outline" {
  if (status === "redeemed") {
    return "default";
  }
  if (status === "available") {
    return "secondary";
  }
  if (status === "expired" || status === "revoked") {
    return "danger";
  }
  return "outline";
}

interface GiftCodeGeneratorCardProps {
  initialSummary: UserGiftCodeSummary;
}

export function GiftCodeGeneratorCard({ initialSummary }: GiftCodeGeneratorCardProps) {
  const api = useMemo(() => createApiClient(), []);
  const [summary, setSummary] = useState(initialSummary);
  const [busyGiftDays, setBusyGiftDays] = useState<number | null>(null);
  const [generatedCode, setGeneratedCode] = useState<UserGiftCodeRecord | null>(summary.recentCodes[0] ?? null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Gift Premium
            {summary.totalAvailableCount > 0 && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-2 py-0.5 uppercase tracking-widest font-black">
                {summary.totalAvailableCount} Available
              </Badge>
            )}
          </h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">
            Each code works once, expires in 3 days, and cannot be redeemed on your own account.
          </p>
        </div>
      </div>

      <div className="border border-border/60 bg-card rounded-2xl overflow-hidden shadow-sm">
        {summary.items.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center bg-muted/10">
            <Gift className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No gift credits available right now.</p>
            <p className="mt-1 max-w-sm text-xs font-medium text-muted-foreground/80">
              Eligible premium plans unlock friend gift credits here after premium is activated.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {summary.items.map((item) => (
              <div key={item.giftDays} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{item.giftDays} Days Premium</h3>
                    <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                      {item.availableCount} of {item.totalCount} left
                    </p>
                  </div>
                </div>
                
                <Button
                  type="button"
                  className={cn(
                    "w-full sm:w-auto h-9 px-6 rounded-lg font-bold text-xs shadow-sm transition-all",
                    item.availableCount > 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"
                  )}
                  disabled={item.availableCount <= 0 || busyGiftDays === item.giftDays}
                  onClick={() => void handleGenerate(item.giftDays)}
                >
                  {busyGiftDays === item.giftDays ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  {busyGiftDays === item.giftDays ? "Generating code..." : item.availableCount > 0 ? "Generate code" : "Out of stock"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {generatedCode && generatedCode.status !== "redeemed" && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Generated Successfully</p>
            </div>
            <p className="font-mono text-xl font-bold tracking-widest text-emerald-950 dark:text-emerald-50">
              {generatedCode.code}
            </p>
            <p className="text-xs font-medium text-emerald-700/80 dark:text-emerald-300/70">
              Valid for {generatedCode.durationDays} days.
            </p>
          </div>
          <Button 
            type="button" 
            variant={copied ? "secondary" : "default"} 
            className={cn("h-9 px-5 rounded-lg font-bold text-xs transition-all w-full sm:w-auto", copied ? "bg-emerald-200 text-emerald-800 hover:bg-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-emerald-600 text-white hover:bg-emerald-700")} 
            onClick={() => void handleCopy(generatedCode.code)}
          >
            {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy code"}
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
          {error}
        </div>
      )}

      {summary.recentCodes.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-sm font-bold text-foreground px-1">History</h3>
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <div className="divide-y divide-border/40">
              {summary.recentCodes.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3.5 hover:bg-muted/10 transition-colors gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono text-sm font-bold tracking-widest text-foreground truncate">{item.code}</p>
                      <Badge tone={statusTone(item.status)} className="px-1.5 py-0 text-[8px] uppercase tracking-widest rounded h-4 border-0">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {item.durationDays}D · {item.status === "redeemed" ? `Redeemed ${formatDate(item.redeemedAt)}` : item.status === "available" ? `Expires ${formatDate(item.expiresAt)}` : `Created ${formatDate(item.createdAt)}`}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-muted/80 hover:text-foreground" onClick={() => void handleCopy(item.code)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
