"use client";

import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Send,
  ShieldCheck,
  Smartphone,
  KeyRound,
  Fingerprint,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getFrontendClientApiBaseUrl } from "@/lib/api-base";
import { buildUserDisplayName } from "@/lib/user-name";
import { useAuthStore } from "@/store/auth-store";
import { AppLoadingPlaceholder } from "@/components/layout/app-loading-placeholder";
import { trackCtaClick, trackLogin } from "@/lib/analytics";
import { cn } from "@/lib/utils";

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
  const inputRef = useRef<HTMLInputElement>(null);

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
        throw new Error(err?.detail || "Invalid code or server error.");
      }

      const data = await response.json();
      const userData = data.user || { id: "user", first_name: "Candidate", phone: "Phone" };

      setSession({
        userId: userData.id,
        sessionId: data.session_id,
        accessToken: data.access_token ?? null,
        refreshToken: data.refresh_token ?? null,
        name: buildUserDisplayName(userData.first_name, userData.last_name),
        phoneNumber: userData.phone ?? userData.username ?? null,
        avatarUrl: userData.avatar_url ?? null,
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
        setErrorMsg(error instanceof Error ? error.message : "Invalid code entered.");
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

  /* ── Split-digit code boxes ── */
  const digits = code.padEnd(6, " ").split("");

  return (
    <div className="fixed inset-0 w-full h-full bg-background overflow-hidden flex items-center justify-center">
      {/* ── Animated mesh background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-orange-500/[0.08] to-transparent blur-3xl" />
        <div className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-blue-500/[0.06] to-transparent blur-3xl" />
        <div className="absolute top-1/4 right-1/3 w-[400px] h-[400px] rounded-full bg-gradient-to-b from-violet-500/[0.05] to-transparent blur-3xl" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(120,119,198,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(120,119,198,0.04)_1px,transparent_1px)] bg-[size:30px_30px] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
      </div>

      {/* ── Close / Back to home ── */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Home</span>
      </Link>

      {/* ── Main container ── */}
      <div className="relative z-10 w-full max-w-[360px] px-6 mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700">

        {/* ── STEP: GUIDE ── */}
        {step === "guide" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 via-orange-500/10 to-transparent border border-orange-500/20 mb-1">
                <Fingerprint className="h-7 w-7 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
                Sign in with your Telegram account to access your IELTS practice dashboard
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-1.5">
              {[
                {
                  icon: Send,
                  title: "Open the bot",
                  desc: (
                    <>
                      Go to{" "}
                      <a
                        href={`https://t.me/${BOT_USERNAME}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-500 hover:text-orange-600 transition-colors"
                      >
                        @{BOT_USERNAME}
                      </a>{" "}
                      in Telegram
                    </>
                  ),
                  color: "from-orange-500/15 to-orange-500/5",
                  iconColor: "text-orange-500",
                  borderColor: "border-orange-500/10",
                },
                {
                  icon: Smartphone,
                  title: "Share your number",
                  desc: "Press Start and send your phone number",
                  color: "from-sky-500/15 to-sky-500/5",
                  iconColor: "text-sky-500",
                  borderColor: "border-sky-500/10",
                },
                {
                  icon: KeyRound,
                  title: "Get your code",
                  desc: "Receive a 6-digit verification code",
                  color: "from-violet-500/15 to-violet-500/5",
                  iconColor: "text-violet-500",
                  borderColor: "border-violet-500/10",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:bg-muted/50",
                    item.borderColor
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
                      item.color
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", item.iconColor)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-1">
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
                className="flex items-center justify-center gap-2.5 w-full h-11 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-black text-sm font-semibold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 hover:from-orange-500 hover:to-orange-500 transition-all active:scale-[0.98]"
              >
                <Send className="h-4 w-4" />
                Open Telegram Bot
                <ArrowRight className="h-4 w-4 opacity-60" />
              </a>

              <button
                onClick={() => {
                  trackCtaClick({
                    ctaName: "open_code_verify",
                    ctaLabel: "I have a code",
                    ctaLocation: "login_page",
                    destination: "/login#verify",
                    authState: "guest",
                  });
                  setStep("verify");
                }}
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <KeyRound className="h-3.5 w-3.5" />
                I already have a code
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: VERIFY ── */}
        {step === "verify" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6 && !isLoading) {
                void handleVerify();
              }
            }}
            className="space-y-8 animate-in fade-in slide-in-from-right-6 duration-500"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 via-sky-500/10 to-transparent border border-sky-500/20 mb-1">
                <ShieldCheck className="h-7 w-7 text-sky-500" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Verification
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from Telegram
              </p>
            </div>

            {/* Code Input — split digit display */}
            <div className="space-y-4">
              <div className="relative">
                <div className="flex justify-center gap-2">
                  {digits.map((d, i) => (
                    <div
                      key={i}
                      onClick={() => inputRef.current?.focus()}
                      className={cn(
                        "w-11 h-13 rounded-lg border flex items-center justify-center text-xl font-semibold transition-all cursor-text",
                        d.trim()
                          ? "border-orange-500/40 bg-orange-500/5 text-foreground shadow-sm shadow-orange-500/10"
                          : i === code.length
                          ? "border-sky-500/50 bg-sky-500/5 text-muted-foreground/30 animate-pulse"
                          : "border-border bg-muted/30 text-muted-foreground/20"
                      )}
                    >
                      {d.trim() || "·"}
                    </div>
                  ))}
                </div>
                {/* Hidden real input underneath */}
                <Input
                  ref={inputRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="absolute inset-0 opacity-0 h-14"
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-4 py-2.5 rounded-lg border border-red-500/15">
                  <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-red-400" />
                  {errorMsg}
                </div>
              )}

              <p className="text-center text-[11px] text-muted-foreground/50">
                Code expires in 3 minutes
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep("guide"); setCode(""); setErrorMsg(""); }}
                disabled={isLoading}
                className="flex items-center justify-center gap-1.5 flex-[0.35] h-11 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-40"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || code.length < 6}
                className={cn(
                  "flex items-center justify-center gap-2 flex-[0.65] h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]",
                  code.length === 6
                    ? "bg-sky-500/15 text-sky-500 border border-sky-500/25 hover:bg-sky-500/20 hover:border-sky-500/35 shadow-sm shadow-sky-500/5"
                    : "bg-muted/50 text-muted-foreground/30 cursor-not-allowed border border-border"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Verify & Sign In
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP: DONE ── */}
        {step === "done" && (
          <div className="text-center space-y-6 animate-in fade-in zoom-in-95 duration-600 py-8">
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl scale-150" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                You&apos;re in!
              </h2>
              <p className="text-sm text-muted-foreground">
                Preparing your dashboard…
              </p>
            </div>
            <div className="flex justify-center">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500/60 animate-pulse"
                    style={{ animationDelay: `${i * 200}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
