"use client";

import { ArrowLeft, KeyRound } from "lucide-react";

import { Input, Label } from "@/components/ui";

import type { LoginFlowController } from "./use-login-flow";

interface LoginFlowFieldsProps {
  controller: LoginFlowController;
}

export function LoginFlowFields({ controller }: LoginFlowFieldsProps) {
  if (controller.isPasswordResetMode) {
    return <PasswordResetFields controller={controller} />;
  }
  if (controller.challenge) {
    return <OtpFields controller={controller} />;
  }
  return <CredentialFields controller={controller} />;
}

function PhoneInput({
  id,
  controller,
  autoFocus = false,
}: {
  id: string;
  controller: LoginFlowController;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <Label
        htmlFor={id}
        className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        Phone number
      </Label>
      <Input
        id={id}
        type="tel"
        value={controller.phoneNumber}
        onChange={(event) => controller.updatePhoneNumber(event.target.value)}
        placeholder="900000001"
        inputMode="numeric"
        maxLength={9}
        autoComplete="username"
        autoFocus={autoFocus}
        className="h-12 rounded-xl border-border/80 !bg-secondary px-4 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:!bg-secondary autofill:[-webkit-text-fill-color:hsl(var(--foreground))] autofill:[box-shadow:0_0_0px_1000px_hsl(var(--secondary))_inset]"
      />
    </div>
  );
}

function PasswordResetFields({
  controller,
}: LoginFlowFieldsProps) {
  return (
    <>
      <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
        If this phone number is linked to an admin account, the Telegram bot
        will send a reset link.
      </div>
      <PhoneInput
        id="reset-phone-number"
        controller={controller}
        autoFocus
      />
      <button
        type="button"
        onClick={controller.returnToSignIn}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </button>
    </>
  );
}

function CredentialFields({ controller }: LoginFlowFieldsProps) {
  return (
    <>
      <PhoneInput id="phone-number" controller={controller} autoFocus />
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <Label
            htmlFor="password"
            className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            Password
          </Label>
          <button
            type="button"
            onClick={controller.startPasswordReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Forgot password?
          </button>
        </div>
        <Input
          id="password"
          type="password"
          value={controller.password}
          onChange={(event) => controller.setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          className="h-12 rounded-xl border-border/80 !bg-secondary px-4 text-sm shadow-inner placeholder:text-muted-foreground focus-visible:!bg-secondary autofill:[-webkit-text-fill-color:hsl(var(--foreground))] autofill:[box-shadow:0_0_0px_1000px_hsl(var(--secondary))_inset]"
        />
      </div>
    </>
  );
}

function OtpFields({ controller }: LoginFlowFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border/70 bg-secondary/70 px-4 py-3 text-sm text-muted-foreground">
        OTP sent to Telegram for{" "}
        <span className="font-semibold text-foreground">
          {controller.phoneNumber}
        </span>
        .
        {controller.expiresRemaining > 0
          ? ` Expires in ${controller.expiresRemaining}s.`
          : " Code expired."}
      </div>
      <div className="space-y-2.5">
        <Label
          htmlFor="otp-code"
          className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
        >
          Telegram OTP
        </Label>
        <Input
          id="otp-code"
          value={controller.otpCode}
          onChange={(event) =>
            controller.setOtpCode(
              event.target.value.replace(/\D/g, "").slice(0, 5),
            )
          }
          placeholder="12345"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          className="h-12 rounded-xl border-border/80 !bg-secondary px-4 text-sm tracking-[0.22em] shadow-inner placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:!bg-secondary"
        />
      </div>
      <button
        type="button"
        onClick={controller.resetChallenge}
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Use a different phone number
      </button>
    </div>
  );
}
