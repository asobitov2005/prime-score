"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { clearAdminSessionCookies } from "@/lib/auth";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, buttonClassName, cn } from "@/components/ui";

type TokenState = "checking" | "valid" | "invalid";
type MessageTone = "error" | "success";

export function ResetPasswordFlow({ token }: { token: string }) {
  const [tokenState, setTokenState] = useState<TokenState>(token ? "checking" : "invalid");
  const [expiresRemaining, setExpiresRemaining] = useState(0);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("error");
  const [isComplete, setIsComplete] = useState(false);

  function showMessage(value: string, tone: MessageTone = "error") {
    setMessage(value);
    setMessageTone(tone);
  }

  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      showMessage("Reset link is invalid or expired.");
      return;
    }

    const controller = new AbortController();

    async function validateToken() {
      try {
        const response = await fetch(`${ADMIN_PUBLIC_API_BASE_URL}/auth/reset-password/${encodeURIComponent(token)}`, {
          method: "GET",
          signal: controller.signal,
        });
        if (!response.ok) {
          setTokenState("invalid");
          showMessage("Reset link is invalid or expired.");
          return;
        }

        const payload = (await response.json()) as { expires_in_seconds?: number };
        setExpiresRemaining(Math.max(0, Number(payload.expires_in_seconds ?? 0)));
        setTokenState("valid");
        setMessage("");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setTokenState("invalid");
        showMessage("Unable to validate reset link.");
      }
    }

    void validateToken();
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (tokenState !== "valid" || expiresRemaining <= 0 || isComplete) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setExpiresRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [expiresRemaining, isComplete, tokenState]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      showMessage("New password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      showMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(`${ADMIN_PUBLIC_API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, new_password: password }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setTokenState("invalid");
        showMessage(payload?.detail ?? "Reset link is invalid or expired.");
        return;
      }

      clearAdminSessionCookies();
      setIsComplete(true);
      setPassword("");
      setConfirmPassword("");
      showMessage(payload?.message ?? "Admin password updated successfully.", "success");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        showMessage("Admin server is not responding.");
        return;
      }
      showMessage("Unable to connect to the admin server.");
    } finally {
      window.clearTimeout(timeoutId);
      setIsSubmitting(false);
    }
  }

  const canSubmit =
    tokenState === "valid" &&
    !isComplete &&
    expiresRemaining > 0 &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword;

  return (
    <div className="mx-auto w-full max-w-[460px]">
      <div className="mb-6 flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">PrimeScore Admin</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">New password</h1>
          </div>
        </div>
        <Badge tone={isComplete ? "success" : tokenState === "valid" ? "info" : "neutral"} className="px-3 py-1 text-[11px] uppercase tracking-[0.18em]">
          {isComplete ? "Updated" : tokenState === "valid" ? "Verified" : "Reset"}
        </Badge>
      </div>

      <Card className="overflow-hidden rounded-[28px] border border-border/70 bg-card/88 shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
        <div className="h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,140,46,0.6),transparent)]" />
        <CardHeader className="space-y-2 pb-6 pt-7">
          <CardTitle className="text-[2rem] tracking-tight">
            {isComplete ? "Password changed" : "Reset admin password"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isComplete ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-4 text-sm font-medium text-success">
                <CheckCircle2 className="mb-3 h-5 w-5" />
                {message}
              </div>
              <Link href="/login" className={buttonClassName({ className: "h-12 w-full rounded-xl text-sm font-semibold tracking-[0.02em]" })}>
                Back to sign in
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm text-muted-foreground",
                  tokenState === "valid" ? "border-primary/20 bg-primary/10" : "border-border/70 bg-secondary/70"
                )}
              >
                {tokenState === "checking"
                  ? "Reset link is being checked."
                  : tokenState === "valid"
                    ? `Reset link expires in ${expiresRemaining}s.`
                    : "Reset link is invalid or expired."}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="new-password" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  New password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={tokenState !== "valid"}
                  className="h-12 rounded-xl border-border/80 !bg-secondary px-4 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:!bg-secondary autofill:[-webkit-text-fill-color:hsl(var(--foreground))] autofill:[box-shadow:0_0_0px_1000px_hsl(var(--secondary))_inset]"
                />
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="confirm-password" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Confirm password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={tokenState !== "valid"}
                  className="h-12 rounded-xl border-border/80 !bg-secondary px-4 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:!bg-secondary autofill:[-webkit-text-fill-color:hsl(var(--foreground))] autofill:[box-shadow:0_0_0px_1000px_hsl(var(--secondary))_inset]"
                />
              </div>

              {message ? (
                <div
                  className={
                    messageTone === "success"
                      ? "rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success"
                      : "rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
                  }
                >
                  {message}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting || !canSubmit}
                className="group h-12 w-full rounded-xl text-sm font-semibold tracking-[0.02em]"
              >
                {isSubmitting ? "Updating..." : "Update password"}
                <KeyRound className="h-4 w-4 transition-transform group-hover:rotate-12" />
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between gap-4 px-1 text-xs text-muted-foreground">
        <div className="inline-flex items-center gap-2">
          <LockKeyhole className="h-4 w-4 text-primary" />
          One-time reset
        </div>
        <Link href="/login" className="font-medium transition-colors hover:text-foreground">
          Sign in
        </Link>
      </div>
    </div>
  );
}
