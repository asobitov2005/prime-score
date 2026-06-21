"use client";

import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  Send,
  ShieldCheck,
  Smartphone,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { Sora } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { getFrontendClientApiBaseUrl } from "@/lib/api-base";
import { buildUserDisplayName } from "@/lib/user-name";
import { useAuthStore } from "@/store/auth-store";
import { AppLoadingPlaceholder } from "@/components/layout/app-loading-placeholder";
import { trackCtaClick, trackLogin } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const display = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const setWelcomeBonus = useAuthStore((state) => state.setWelcomeBonus);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [step, setStep] = useState<"guide" | "verify">("guide");
  const rawReturnUrl = searchParams.get("returnUrl");
  const safeReturnUrl = rawReturnUrl?.startsWith("/") && !rawReturnUrl.startsWith("//")
    ? rawReturnUrl
    : "/dashboard";

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      return;
    }
    router.replace(safeReturnUrl);
  }, [hasHydrated, isAuthenticated, router, safeReturnUrl]);

  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const verifyInFlightRef = useRef(false);
  const isLoginBusy = isLoading || isRedirecting;

  const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "primescorebot";

  const handleVerify = async () => {
    if (verifyInFlightRef.current || isRedirecting) {
      return;
    }
    const normalizedCode = code.trim();
    if (normalizedCode.length !== 6) {
      return;
    }
    verifyInFlightRef.current = true;
    setIsLoading(true);
    setErrorMsg("");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);
    let didStartRedirect = false;

    try {
      const apiUrl = getFrontendClientApiBaseUrl();

      const response = await fetch(`${apiUrl}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: 0,
          code: normalizedCode,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.detail || "Invalid code or server error.");
      }

      const data = await response.json();
      const userData = data.user || { id: "user", first_name: "Candidate", phone: "Phone" };
      const isNewUser = Boolean(data.is_new_user);

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
        createdAt: userData.created_at ?? null,
      });
      const welcomeBonusDays = Number(data.welcome_bonus_days ?? (isNewUser ? 1 : 0));
      if (welcomeBonusDays > 0) {
        setWelcomeBonus(welcomeBonusDays);
      }
      trackLogin({
        method: "telegram_code",
        isPremium: Boolean(userData.is_premium),
      });

      didStartRedirect = true;
      setIsRedirecting(true);
      window.setTimeout(() => {
        window.location.assign(safeReturnUrl);
      }, 0);
    } catch (error: unknown) {
      console.error("Login verification error:", error);
      if (error instanceof Error && error.name === "AbortError") {
        setErrorMsg("PrimeScore server is not responding.");
      } else {
        setErrorMsg(error instanceof Error ? error.message : "Invalid code entered.");
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (!didStartRedirect) {
        verifyInFlightRef.current = false;
        setIsLoading(false);
      }
    }
  };

  if (!hasHydrated || (isAuthenticated && step === "guide")) {
    return (
      <AppLoadingPlaceholder
        mode="overlay"
      />
    );
  }

  /* ── Split-digit code boxes ── */
  const digits = code.padEnd(6, " ").split("");

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-white dark:bg-slate-950 lg:grid lg:grid-cols-2">
      {/* ════ LEFT: brand panel (lg+) ════ */}
      <aside className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-aurora absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.4),transparent_62%)]" />
          <div className="animate-aurora-slow absolute -bottom-24 -right-16 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.28),transparent_62%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>

        <Link href="/" className="relative flex items-center gap-2.5">
          {/* brand panel is always dark → use dark-mode logo assets */}
          <img src="/logo.svg" alt="PrimeScore" className="h-8 w-auto object-contain" />
          <span className="flex h-9 items-center" aria-hidden="true">
            <img src="/exam-logo-darkmode.svg" alt="" className="h-full w-auto object-contain" />
          </span>
        </Link>

        <div className="relative">
          <h2 className={cn(display.className, "max-w-md text-4xl font-extrabold leading-[1.05] tracking-[-0.02em] text-white xl:text-5xl")}>
            {"Turn Practice Into\u00a0"}
            <span className="text-orange-400">{"Results."}</span>
          </h2>
          <p className="mt-3 max-w-sm text-lg font-semibold leading-7 text-orange-400">
            {"Practice. Score. Succeed."}
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "AI Band Estimate on every test",
              "Practice that targets weak skills",
              "Progress synced across devices",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[15px] text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[13px] text-slate-500">© {new Date().getFullYear()} PrimeScore — IELTS mock platform</p>
      </aside>

      {/* ════ RIGHT: form ════ */}
      <main className="relative flex min-h-[100dvh] flex-col px-5 py-6 sm:px-8 lg:min-h-0 lg:py-12">
        {/* soft background for mobile/standalone */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden">
          <div className="animate-aurora absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.16),transparent_65%)]" />
        </div>

        {/* top bar */}
        <div className="relative flex items-center justify-between gap-3">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3.5 py-2 text-[13px] font-semibold text-slate-600 backdrop-blur transition-colors hover:border-orange-200 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:text-orange-300"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {"Home"}
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <img src="/logo-light.svg" alt="PrimeScore" className="h-7 w-auto object-contain dark:hidden" />
              <img src="/logo.svg" alt="PrimeScore" className="hidden h-7 w-auto object-contain dark:block" />
              <span className="flex h-7 items-center" aria-hidden="true">
                <img src="/exam-logo-lightmode.svg" alt="" className="h-full w-auto object-contain dark:hidden" />
                <img src="/exam-logo-darkmode.svg" alt="" className="hidden h-full w-auto object-contain dark:block" />
              </span>
            </Link>
          </div>
        </div>

        {/* centered content */}
        <div className="relative flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* ── STEP: GUIDE ── */}
            {step === "guide" && (
              <div className="space-y-6">
                <div className="space-y-2.5">
                  <h1 className={cn(display.className, "text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl")}>
                    {"Welcome back"}
                  </h1>
                  <p className="max-w-md text-[15px] leading-7 text-slate-500 dark:text-slate-400">
                    {"Sign in with your Telegram account to reach your IELTS practice dashboard."}
                  </p>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  {[
                    {
                      icon: Send,
                      title: "Open the bot",
                      desc: (
                        <>
                          Go to 
                          <a
                            href={`https://t.me/${BOT_USERNAME}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-orange-500 hover:text-orange-600"
                          >
                            @{BOT_USERNAME}
                          </a>{" "}
                          in Telegram
                        </>
                      ),
                    },
                    {
                      icon: Smartphone,
                      title: "Share your number",
                      desc: "Press Start and send your phone number",
                    },
                    {
                      icon: KeyRound,
                      title: "Get your code",
                      desc: "Receive a 6-digit verification code",
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 transition-colors hover:border-orange-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-orange-500/30"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                        <item.icon className="h-[18px] w-[18px]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                        <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-2.5">
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
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 text-sm font-semibold text-white shadow-[0_16px_32px_-18px_rgba(249,115,22,0.85)] transition-all hover:-translate-y-0.5 hover:bg-orange-600 active:scale-[0.99]"
                  >
                    <KeyRound className="h-4 w-4" />
                    {"I already have a code"}
                    <ArrowRight className="h-4 w-4 opacity-80" />
                  </button>

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
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:text-orange-600 active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-orange-500/30 dark:hover:text-orange-300"
                  >
                    <Send className="h-4 w-4 text-orange-500" />
                    {"Open Telegram Bot"}
                    <ArrowRight className="h-4 w-4 opacity-50" />
                  </a>
                </div>
              </div>
            )}

            {/* ── STEP: VERIFY ── */}
            {step === "verify" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (code.length === 6 && !isLoginBusy) {
                    void handleVerify();
                  }
                }}
                className="space-y-8 animate-in fade-in slide-in-from-right-6 duration-500"
              >
                <div className="space-y-3">
                  <h1 className={cn(display.className, "text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl")}>
                    {"Enter your code"}
                  </h1>
                  <p className="text-[15px] leading-7 text-slate-500 dark:text-slate-400">
                    {"Type the 6-digit code you received from the Telegram bot."}
                  </p>
                </div>

                {/* Code Input — bigger split-digit boxes */}
                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex justify-start gap-2 sm:gap-3">
                      {digits.map((d, i) => (
                        <div
                          key={i}
                          onClick={() => inputRef.current?.focus()}
                          className={cn(
                            "flex h-14 max-w-[3rem] flex-1 cursor-text items-center justify-center rounded-xl border-2 text-xl font-semibold transition-all sm:h-16 sm:max-w-[3.4rem] sm:text-2xl",
                            d.trim()
                              ? "border-orange-400 bg-orange-50 text-slate-900 shadow-[0_10px_30px_-15px_rgba(249,115,22,0.6)] dark:border-orange-500/60 dark:bg-orange-500/10 dark:text-white"
                              : i === code.length
                              ? "border-orange-300 bg-orange-50/40 text-slate-300 animate-pulse dark:border-orange-500/40 dark:bg-orange-500/5"
                              : "border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-700"
                          )}
                        >
                          {d.trim() || "•"}
                        </div>
                      ))}
                    </div>
                    {/* Hidden real input underneath */}
                    <Input
                      ref={inputRef}
                      value={code}
                      onChange={(e) => {
                        if (isLoginBusy) return;
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      }}
                      className="absolute inset-0 h-full w-full opacity-0"
                      maxLength={6}
                      autoFocus
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      disabled={isLoginBusy}
                    />
                  </div>

                  {isLoginBusy ? (
                    <div className="flex items-center gap-2 rounded-xl border border-orange-500/15 bg-orange-500/10 px-4 py-2.5 text-[13px] font-medium text-orange-700 dark:text-orange-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isRedirecting ? "Signing you in..." : "Verifying your code..."}
                    </div>
                  ) : null}

                  {errorMsg && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/15 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-500 dark:text-red-400">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      {errorMsg}
                    </div>
                  )}

                  <p className="text-center text-[12px] text-slate-400 dark:text-slate-500">
                    {"Code expires in 3 minutes"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setStep("guide"); setCode(""); setErrorMsg(""); }}
                    disabled={isLoginBusy}
                    className="flex h-12 flex-[0.4] items-center justify-center gap-1.5 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {"Back"}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoginBusy || code.length < 6}
                    className={cn(
                      "flex h-12 flex-[0.6] items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all active:scale-[0.99]",
                      code.length === 6 && !isLoginBusy
                        ? "bg-orange-500 text-white shadow-[0_20px_40px_-18px_rgba(249,115,22,0.85)] hover:-translate-y-0.5 hover:bg-orange-600"
                        : "cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600"
                    )}
                  >
                    {isLoginBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isRedirecting ? "Signing in" : "Verifying"}
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        {"Verify & Sign In"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
