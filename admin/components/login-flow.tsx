"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminAuthResponse, setAdminSessionCookies } from "@/lib/auth";
import { ADMIN_PUBLIC_API_BASE_URL } from "@/lib/public-api";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";

export function LoginFlow() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        body: JSON.stringify({ login, password }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setMessage(payload?.detail ?? "Invalid login or password.");
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
          <CardDescription className="text-sm leading-7">
            Enter your admin login details to continue.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2.5">
              <Label htmlFor="login" className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Login or email
              </Label>
              <Input
                id="login"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="admin"
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

            {message ? (
              <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {message}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={isSubmitting || !login.trim() || !password.trim()}
              className="group h-12 w-full rounded-xl text-sm font-semibold tracking-[0.02em]"
            >
              {isSubmitting ? "Signing in..." : "Enter admin panel"}
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
