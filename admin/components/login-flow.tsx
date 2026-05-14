"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminAuthChallengeResponse, AdminAuthResponse, setAdminSessionCookies } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@/components/ui";

export function LoginFlow() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challenge, setChallenge] = useState<AdminAuthChallengeResponse | null>(null);
  const [expiresRemaining, setExpiresRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  function updatePhoneNumber(value: string) {
    setPhoneNumber(value.replace(/\D/g, "").slice(0, 9));
  }

  useEffect(() => {
    if (!challenge || expiresRemaining <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setExpiresRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [challenge, expiresRemaining]);

  async function requestOtp() {
    setIsSubmitting(true);
    setMessage("");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(`${ADMIN_PUBLIC_API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ phone_number: phoneNumber, password }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setMessage(payload?.detail ?? "Invalid phone number or password.");
        return;
      }

      const payload = (await response.json()) as AdminAuthChallengeResponse;
      setChallenge(payload);
      setExpiresRemaining(payload.expires_in_seconds);
      setPassword("");
      setOtpCode("");
      setMessage("");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessage("Admin server is not responding.");
        return;
      }
      setMessage("Unable to connect to the admin server.");
    } finally {
      window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  }

  async function verifyOtp() {
    if (!challenge) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(`${ADMIN_PUBLIC_API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ challenge_id: challenge.challenge_id, otp_code: otpCode }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setMessage(payload?.detail ?? "Invalid or expired OTP.");
        return;
      }

      const payload = (await response.json()) as AdminAuthResponse;
      setAdminSessionCookies(payload);
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessage("Admin server is not responding.");
        return;
      }
      setMessage("Unable to connect to the admin server.");
    } finally {
      window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (challenge) {
      await verifyOtp();
      return;
    }
    await requestOtp();
  }

  function resetChallenge() {
    setChallenge(null);
    setOtpCode("");
    setExpiresRemaining(0);
    setMessage("");
  }

  const canSubmitCredentials = phoneNumber.trim().length > 0 && password.trim().length > 0;
  const canSubmitOtp = Boolean(challenge) && otpCode.trim().length === 5 && expiresRemaining > 0;

  return (
    <div className="mx-auto w-full max-w-[460px]">
      <div className="mb-6 flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">PrimeScore Admin</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
          </div>
        </div>
        <Badge tone="neutral" className="px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
          Secure
        </Badge>
      </div>

      <Card className="overflow-hidden rounded-[28px] border border-border/70 bg-card/88 shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
        <div className="h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,140,46,0.6),transparent)]" />
        <CardHeader className="space-y-2 pb-6 pt-7">
          <CardTitle className="text-[2rem] tracking-tight">Control panel access</CardTitle>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            {!challenge ? (
              <>
                <div className="space-y-2.5">
                  <Label htmlFor="phone-number" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Phone number
                  </Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => updatePhoneNumber(event.target.value)}
                    placeholder="xxxx"
                    inputMode="numeric"
                    maxLength={9}
                    autoComplete="username"
                    autoFocus
                    className="h-12 rounded-xl border-border/80 !bg-secondary px-4 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:!bg-secondary autofill:[-webkit-text-fill-color:hsl(var(--foreground))] autofill:[box-shadow:0_0_0px_1000px_hsl(var(--secondary))_inset]"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="password" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="h-12 rounded-xl border-border/80 !bg-secondary px-4 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:!bg-secondary autofill:[-webkit-text-fill-color:hsl(var(--foreground))] autofill:[box-shadow:0_0_0px_1000px_hsl(var(--secondary))_inset]"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-secondary/70 px-4 py-3 text-sm text-muted-foreground">
                  OTP sent to Telegram for <span className="font-semibold text-foreground">{phoneNumber}</span>.
                  {expiresRemaining > 0 ? ` Expires in ${expiresRemaining}s.` : " Code expired."}
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="otp-code" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Telegram OTP
                  </Label>
                  <Input
                    id="otp-code"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="12345"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    className="h-12 rounded-xl border-border/80 !bg-secondary px-4 text-sm tracking-[0.22em] shadow-inner placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:!bg-secondary"
                  />
                </div>
                <button
                  type="button"
                  onClick={resetChallenge}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Use a different phone number
                </button>
              </div>
            )}

            {message ? (
              <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {message}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting || (challenge ? !canSubmitOtp : !canSubmitCredentials)}
              className="group h-12 w-full rounded-xl text-sm font-semibold tracking-[0.02em]"
            >
              {isSubmitting ? "Checking..." : challenge ? "Verify OTP" : "Send Telegram OTP"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between gap-4 px-1 text-xs text-muted-foreground">
        <div className="inline-flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-primary" />
          Restricted access
        </div>
        <p>PrimeScore © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
