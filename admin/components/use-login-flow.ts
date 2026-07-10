"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  type AdminAuthChallengeResponse,
  type AdminAuthResponse,
  setAdminSessionCookies,
} from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";

type LoginMode = "sign-in" | "forgot-password";
type MessageTone = "error" | "success";

export interface LoginFlowController {
  phoneNumber: string;
  password: string;
  otpCode: string;
  challenge: AdminAuthChallengeResponse | null;
  expiresRemaining: number;
  isSubmitting: boolean;
  message: string;
  messageTone: MessageTone;
  isPasswordResetMode: boolean;
  submitDisabled: boolean;
  submitLabel: string;
  updatePhoneNumber: (value: string) => void;
  setPassword: (value: string) => void;
  setOtpCode: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  resetChallenge: () => void;
  startPasswordReset: () => void;
  returnToSignIn: () => void;
}

export function useLoginFlow(): LoginFlowController {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challenge, setChallenge] =
    useState<AdminAuthChallengeResponse | null>(null);
  const [mode, setMode] = useState<LoginMode>("sign-in");
  const [expiresRemaining, setExpiresRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("error");

  useEffect(() => {
    if (!challenge || expiresRemaining <= 0) return;
    const intervalId = window.setInterval(() => {
      setExpiresRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [challenge, expiresRemaining]);

  function updatePhoneNumber(value: string) {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("998") && digits.length > 9) {
      digits = digits.slice(3);
    }
    setPhoneNumber(digits.slice(0, 9));
  }

  function clearMessage() {
    setMessage("");
  }

  function showMessage(value: string, tone: MessageTone) {
    setMessageTone(tone);
    setMessage(value);
  }

  async function requestJson(
    path: string,
    body: Record<string, string>,
  ): Promise<{ ok: boolean; payload: Record<string, unknown> | null }> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch(`${ADMIN_PUBLIC_API_BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return {
        ok: response.ok,
        payload: await response.json().catch(() => null),
      };
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function requestOtp() {
    setIsSubmitting(true);
    clearMessage();
    try {
      const { ok, payload } = await requestJson("/auth/login", {
        phone_number: phoneNumber,
        password,
      });
      if (!ok) {
        showMessage(
          String(payload?.detail ?? "Invalid phone number or password."),
          "error",
        );
        return;
      }
      const authChallenge = payload as unknown as AdminAuthChallengeResponse;
      setChallenge(authChallenge);
      setExpiresRemaining(authChallenge.expires_in_seconds);
      setPassword("");
      setOtpCode("");
      clearMessage();
    } catch (error) {
      showConnectionError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp() {
    if (!challenge) return;
    setIsSubmitting(true);
    clearMessage();
    try {
      const { ok, payload } = await requestJson("/auth/verify-otp", {
        challenge_id: challenge.challenge_id,
        otp_code: otpCode,
      });
      if (!ok) {
        showMessage(String(payload?.detail ?? "Invalid or expired OTP."), "error");
        return;
      }
      setAdminSessionCookies(payload as unknown as AdminAuthResponse);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      showConnectionError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestPasswordReset() {
    setIsSubmitting(true);
    clearMessage();
    try {
      const { ok, payload } = await requestJson("/auth/forgot-password", {
        phone_number: phoneNumber,
      });
      if (!ok) {
        showMessage(
          String(payload?.detail ?? "Unable to request password reset."),
          "error",
        );
        return;
      }
      setPassword("");
      setOtpCode("");
      showMessage(
        String(
          payload?.message ??
            "If this phone number is linked to an admin account, a reset link has been sent.",
        ),
        "success",
      );
    } catch (error) {
      showConnectionError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function showConnectionError(error: unknown) {
    showMessage(
      error instanceof Error && error.name === "AbortError"
        ? "Admin server is not responding."
        : "Unable to connect to the admin server.",
      "error",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "forgot-password") await requestPasswordReset();
    else if (challenge) await verifyOtp();
    else await requestOtp();
  }

  function resetChallenge() {
    setChallenge(null);
    setOtpCode("");
    setExpiresRemaining(0);
    clearMessage();
  }

  function startPasswordReset() {
    setMode("forgot-password");
    setChallenge(null);
    setPassword("");
    setOtpCode("");
    setExpiresRemaining(0);
    clearMessage();
  }

  function returnToSignIn() {
    setMode("sign-in");
    setPassword("");
    setOtpCode("");
    setExpiresRemaining(0);
    setChallenge(null);
    clearMessage();
  }

  const isPasswordResetMode = mode === "forgot-password";
  const canSubmitCredentials = phoneNumber.trim().length > 0 && password.trim().length > 0;
  const canSubmitReset = phoneNumber.trim().length > 0;
  const canSubmitOtp = Boolean(challenge) && otpCode.trim().length === 5 && expiresRemaining > 0;
  const submitDisabled =
    isSubmitting ||
    (isPasswordResetMode
      ? !canSubmitReset
      : challenge
        ? !canSubmitOtp
        : !canSubmitCredentials);
  const submitLabel = isSubmitting
    ? isPasswordResetMode
      ? "Sending..."
      : "Checking..."
    : isPasswordResetMode
      ? "Send reset prompt"
      : challenge
        ? "Verify OTP"
        : "Send Telegram OTP";

  return {
    phoneNumber,
    password,
    otpCode,
    challenge,
    expiresRemaining,
    isSubmitting,
    message,
    messageTone,
    isPasswordResetMode,
    submitDisabled,
    submitLabel,
    updatePhoneNumber,
    setPassword,
    setOtpCode,
    handleSubmit,
    resetChallenge,
    startPasswordReset,
    returnToSignIn,
  };
}
