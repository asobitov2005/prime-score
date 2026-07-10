"use client";
import type { BaseScope } from "./base";
import { AppLoadingPlaceholder, buildUserDisplayName, getFrontendClientApiBaseUrl, trackLogin, useAuthStore, useEffect, useRef, useRouter, useSearchParams, useState } from "../dependencies";

export function useControllerPart1(scope: BaseScope) {
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

  return { router, searchParams, setSession, setWelcomeBonus, isAuthenticated, hasHydrated, step, setStep, rawReturnUrl, safeReturnUrl, code, setCode, isLoading, setIsLoading, isRedirecting, setIsRedirecting, errorMsg, setErrorMsg, inputRef, verifyInFlightRef, isLoginBusy, BOT_USERNAME, handleVerify, digits };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
