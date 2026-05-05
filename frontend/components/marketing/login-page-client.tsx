"use client";

import { Loader2, CheckCircle2, ExternalLink, MessageSquareShare, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getFrontendClientApiBaseUrl } from "@/lib/api-base";
import { buildUserDisplayName } from "@/lib/user-name";
import { useAuthStore } from "@/store/auth-store";
import { AppLoadingPlaceholder } from "@/components/layout/app-loading-placeholder";
import { trackCtaClick, trackLogin } from "@/lib/analytics";

export function LoginPageClient() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [step, setStep] = useState<"guide" | "verify" | "done">("guide");

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      return;
    }
    router.replace("/dashboard");
  }, [hasHydrated, isAuthenticated, router]);

  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const BOT_USERNAME = "primescorebot";

  const handleVerify = async () => {
    setIsLoading(true);
    setErrorMsg("");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);

    try {
      const apiUrl = getFrontendClientApiBaseUrl();

      const response = await fetch(`${apiUrl}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: 0,
          code,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || "Noto'g'ri kod kiritildi yoki server xatosi.");
      }

      const data = await response.json();
      const userData = data.user || { id: "user", first_name: "Candidate", username: "Phone" };

      setSession({
        userId: userData.id,
        sessionId: data.session_id,
        accessToken: data.access_token ?? null,
        refreshToken: data.refresh_token ?? null,
        name: buildUserDisplayName(userData.first_name, userData.last_name),
        phoneNumber: userData.username ?? null,
        isPremium: Boolean(userData.is_premium),
        premiumUntil: userData.premium_until ?? null,
      });
      trackLogin({
        method: "telegram_code",
        isPremium: Boolean(userData.is_premium),
      });

      setStep("done");
      setTimeout(() => router.replace("/dashboard"), 1500);
    } catch (error: unknown) {
      console.error("Login verification error:", error);
      if (error instanceof Error && error.name === "AbortError") {
        setErrorMsg("PrimeScore server is not responding.");
      } else {
        setErrorMsg(error instanceof Error ? error.message : "Noto'g'ri kod kiritildi.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  if (!hasHydrated || isAuthenticated) {
    return (
      <AppLoadingPlaceholder
        mode="overlay"
      />
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center p-6 bg-background overflow-hidden animate-in fade-in duration-500 pt-24 md:pt-32">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-96 bg-primary/5 blur-[100px] pointer-events-none rounded-full" />

      <div className="w-full max-w-[400px] space-y-6 relative z-10">
        <Card className="border-border shadow-2xl shadow-black/5 rounded-[2rem] overflow-hidden bg-card relative">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="absolute top-4 right-4 h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/50 transition-colors z-20"
          >
            <Link href="/">
              <X className="h-4 w-4" />
            </Link>
          </Button>

          <CardHeader className="space-y-3 pt-10 px-8 text-center border-b border-border/50 pb-8 bg-muted/5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner ring-1 ring-primary/20">
              <MessageSquareShare className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Sign In</CardTitle>
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Verification via Telegram
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-8 pb-10 min-h-[300px] flex flex-col justify-center">
            {step === "guide" && (
              <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-400">
                <div className="space-y-4 text-center">
                  <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-3 text-left font-medium text-xs text-muted-foreground leading-relaxed shadow-inner">
                    <p className="flex gap-3 text-foreground"><span className="text-primary font-bold">1.</span> Open <span className="text-primary font-bold">@{BOT_USERNAME}</span> in Telegram</p>
                    <p className="flex gap-3"><span className="text-primary font-bold">2.</span> Press Start and share your number</p>
                    <p className="flex gap-3"><span className="text-primary font-bold">3.</span> Get your 6-digit login code</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <Button asChild className="w-full h-12 text-sm font-black rounded-xl shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 border-0 transition-all hover:-translate-y-0.5 group">
                    <a
                      href={`https://t.me/${BOT_USERNAME}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        trackCtaClick({
                          ctaName: "open_telegram_bot",
                          ctaLabel: "Open Telegram Bot",
                          ctaLocation: "login_page",
                          destination: `https://t.me/${BOT_USERNAME}`,
                          authState: "guest",
                        });
                      }}
                    >
                      <MessageSquareShare className="mr-2 h-4 w-4" /> Open Telegram Bot <ExternalLink className="ml-2 h-4 w-4 opacity-50 transition-transform group-hover:translate-x-1" />
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      trackCtaClick({
                        ctaName: "open_code_verify",
                        ctaLabel: "I have the code",
                        ctaLocation: "login_page",
                        destination: "/login#verify",
                        authState: "guest",
                      });
                      setStep("verify");
                    }}
                    className="w-full h-12 text-sm font-bold rounded-xl border-border/60"
                  >
                    I have the code
                  </Button>
                </div>
              </div>
            )}

            {step === "verify" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.length === 6 && !isLoading) {
                    void handleVerify();
                  }
                }}
                className="space-y-6 animate-in slide-in-from-right-4 duration-400"
              >
                <div className="text-center space-y-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Enter 6-Digit Code</label>
                    <Input
                      placeholder="••••••"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="h-16 bg-muted/20 border-border/60 text-center tracking-[0.5em] text-3xl font-black rounded-xl focus-visible:ring-primary shadow-inner"
                      maxLength={6}
                      autoFocus
                    />
                  </div>

                  {errorMsg && (
                    <div className="text-xs font-bold text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                      {errorMsg}
                    </div>
                  )}

                  <p className="text-[11px] font-bold text-muted-foreground">
                    This code is valid for 3 minutes.
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-[0.4] h-12 rounded-xl font-bold border-border/60" onClick={() => setStep("guide")} disabled={isLoading}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-[0.6] h-12 rounded-xl font-black shadow-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:-translate-y-0.5" disabled={isLoading || code.length < 6}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & Login"}
                  </Button>
                </div>
              </form>
            )}

            {step === "done" && (
              <div className="text-center space-y-6 animate-in zoom-in-95 duration-400 py-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center animate-in zoom-in-50 duration-500 delay-150 border border-emerald-500/20 shadow-sm">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-foreground tracking-tight">Access Granted</h3>
                  <p className="text-xs font-bold text-muted-foreground">Redirecting you to dashboard...</p>
                </div>
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary opacity-40" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
