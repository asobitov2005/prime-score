"use client";

import { ArrowRight, CheckCircle2, Loader2, Send, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { createApiClient } from "@/lib/api/client";
import { trackLogin } from "@/lib/analytics";
import { buildUserDisplayName } from "@/lib/user-name";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

type TelegramWebApp = {
  initData: string;
  initDataUnsafe?: {
    user?: {
      id?: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  };
  ready: () => void;
  expand: () => void;
  close?: () => void;
  requestContact?: (callback: (success: boolean) => void) => void;
  openTelegramLink?: (url: string) => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

type LoginState = "loading" | "need_telegram" | "ready" | "requesting_contact" | "signing_in" | "success" | "error";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "primescorebot";

function resolveSafeReturnUrl(value: string | null): string {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
}

function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.Telegram?.WebApp ?? null;
}

function requestTelegramContact(webApp: TelegramWebApp): Promise<boolean> {
  const requestContact = webApp.requestContact;
  if (!requestContact) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, 8000);

    try {
      requestContact((success) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        resolve(Boolean(success));
      });
    } catch {
      if (!settled) {
        settled = true;
        window.clearTimeout(timer);
        resolve(false);
      }
    }
  });
}

export function TelegramWebAppLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((state) => state.setSession);
  const setWelcomeBonus = useAuthStore((state) => state.setWelcomeBonus);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [status, setStatus] = useState<LoginState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const safeReturnUrl = resolveSafeReturnUrl(searchParams.get("returnUrl"));
  const telegramUser = webApp?.initDataUnsafe?.user;

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg?.initData) {
      window.location.replace("/");
      return;
    }

    try {
      tg.ready();
      tg.expand();
    } catch {}

    setWebApp(tg);
    setStatus("ready");
  }, []);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) {
      return;
    }
    router.replace(safeReturnUrl);
  }, [hasHydrated, isAuthenticated, router, safeReturnUrl]);

  const handleTelegramLogin = async () => {
    const tg = webApp ?? getTelegramWebApp();
    if (!tg?.initData) {
      setStatus("need_telegram");
      return;
    }

    setErrorMessage("");
    setStatus("requesting_contact");
    const contactShared = await requestTelegramContact(tg);

    setStatus("signing_in");
    try {
      const api = createApiClient();
      const data = await api.telegramWebAppLogin({
        initData: tg.initData,
        requestContact: contactShared,
      });
      const userData = data.user;
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
        method: "telegram_webapp",
        isPremium: Boolean(userData.is_premium),
      });

      setStatus("success");
      window.setTimeout(() => {
        window.location.assign(safeReturnUrl);
      }, 250);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Telegram login failed.");
      setStatus("error");
    }
  };

  const isBusy = status === "requesting_contact" || status === "signing_in" || status === "loading";

  return (
    <main className="fixed inset-0 z-[80] flex min-h-screen items-center justify-center overflow-hidden bg-[#08111f] px-5 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.32),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.28),transparent_35%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:34px_34px] opacity-50" />

      <section className="relative w-full max-w-[420px] rounded-[2rem] border border-white/12 bg-white/[0.08] p-6 shadow-2xl shadow-black/35 backdrop-blur-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/18 text-orange-200 ring-1 ring-orange-300/20">
            <Send className="h-6 w-6" />
          </div>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
            Telegram Mini App
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-[-0.04em] text-white">
            Open PrimeScore in Telegram
          </h1>
          <p className="text-sm leading-6 text-slate-300">
            One tap login. We verify Telegram initData on the backend and request your phone only through Telegram.
          </p>
        </div>

        {telegramUser ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signed Telegram account</p>
            <p className="mt-1 text-base font-semibold text-white">
              {buildUserDisplayName(telegramUser.first_name ?? "Telegram", telegramUser.last_name)}
            </p>
            {telegramUser.username && <p className="text-sm text-slate-400">@{telegramUser.username}</p>}
          </div>
        ) : null}

        {status === "need_telegram" ? (
          <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-50">
            This page must be opened inside Telegram. Start the bot and tap <b>Open PrimeScore</b>.
          </div>
        ) : null}

        {status === "error" && errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-300/20 bg-red-500/10 p-4 text-sm text-red-50">
            {errorMessage}
          </div>
        ) : null}

        {status === "success" ? (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-50">
            <CheckCircle2 className="h-5 w-5" />
            Login complete. Opening your dashboard...
          </div>
        ) : null}

        <div className="mt-7 space-y-3">
          <button
            type="button"
            onClick={handleTelegramLogin}
            disabled={isBusy || status === "need_telegram" || status === "success"}
            className={cn(
              "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition active:scale-[0.99]",
              status === "need_telegram"
                ? "cursor-not-allowed bg-white/10 text-white/40"
                : "bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:bg-orange-400",
            )}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            {status === "requesting_contact" ? "Requesting phone..." : status === "signing_in" ? "Signing in..." : "Continue with Telegram"}
            {!isBusy && <ArrowRight className="h-4 w-4" />}
          </button>

          {status === "need_telegram" ? (
            <a
              href={`https://t.me/${BOT_USERNAME}?start=webapp`}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] text-sm font-semibold text-white transition hover:bg-white/[0.1]"
            >
              Open @{BOT_USERNAME}
            </a>
          ) : null}

          <Link
            href="/login"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            <ShieldCheck className="h-4 w-4" />
            Use 6-digit code instead
          </Link>
        </div>
      </section>
    </main>
  );
}
