"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminAuthResponse, setAdminSessionCookies } from "@/lib/auth";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";

const adminApiBaseUrl = (process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL ?? "http://localhost:8000/api/admin").replace(/\/$/, "");

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

    try {
      const response = await fetch(`${adminApiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ login, password })
      });

      if (!response.ok) {
        setMessage("Invalid credentials.");
        return;
      }

      const payload = (await response.json()) as AdminAuthResponse;
      setAdminSessionCookies(payload);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMessage("Sign-in failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Admin authentication
        </div>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">PrimeScore Admin</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">Sign in with your admin credentials.</p>
        </div>

        <div className="h-px w-full max-w-md bg-border" />
      </div>

      <Card className="self-center border border-border/80 shadow-xl shadow-black/10">
        <CardHeader>
          <Badge tone="info" className="mb-3 w-fit">
            Secure login
          </Badge>
          <CardTitle>Enter admin credentials</CardTitle>
          <CardDescription>Use your username or email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="login">Username or email</Label>
              <Input
                id="login"
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="admin or admin@primescore.local"
                autoComplete="username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" disabled={isSubmitting || !login.trim() || !password.trim()} className="inline-flex w-full items-center justify-center gap-2">
              {isSubmitting ? "Signing in..." : "Sign in"}
              <ArrowRight className="h-4 w-4" />
            </Button>

            {message ? <p className="text-sm leading-6 text-muted-foreground">{message}</p> : null}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
