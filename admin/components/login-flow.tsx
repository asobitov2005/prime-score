"use client";

import {
  ArrowRight,
  LockKeyhole,
  Send,
  ShieldCheck,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";

import { LoginFlowFields } from "./login-flow-fields";
import { useLoginFlow } from "./use-login-flow";

export function LoginFlow() {
  const controller = useLoginFlow();
  return (
    <div className="mx-auto w-full max-w-[460px]">
      <div className="mb-6 flex items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              PrimeScore Admin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {controller.isPasswordResetMode ? "Reset password" : "Sign in"}
            </h1>
          </div>
        </div>
        <Badge
          tone={controller.isPasswordResetMode ? "info" : "neutral"}
          className="px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
        >
          {controller.isPasswordResetMode ? "Telegram" : "Secure"}
        </Badge>
      </div>

      <Card className="overflow-hidden rounded-[28px] border border-border/70 bg-card/88 shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
        <div className="h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,140,46,0.6),transparent)]" />
        <CardHeader className="space-y-2 pb-6 pt-7">
          <CardTitle className="text-[2rem] tracking-tight">
            {controller.isPasswordResetMode
              ? "Recover admin access"
              : "Control panel access"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={controller.handleSubmit}>
            <LoginFlowFields controller={controller} />
            {controller.message ? (
              <div
                className={
                  controller.messageTone === "success"
                    ? "rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success"
                    : "rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
                }
              >
                {controller.message}
              </div>
            ) : null}
            <Button
              type="submit"
              disabled={controller.submitDisabled}
              className="group h-12 w-full rounded-xl text-sm font-semibold tracking-[0.02em]"
            >
              {controller.submitLabel}
              {controller.isPasswordResetMode ? (
                <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              ) : (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
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
