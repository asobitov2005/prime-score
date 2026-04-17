"use client";

import { ArrowRight, MessageCircleMore, Phone, ShieldCheck, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify" | "done">("request");
  const [code, setCode] = useState("");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-5xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="grid w-full gap-0 overflow-hidden lg:grid-cols-[0.95fr_1.05fr] border-none shadow-xl ring-1 ring-border">
        <div className="bg-secondary p-8 text-foreground relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <Badge tone="outline" className="border-border bg-muted text-slate-200">
              Telegram-only auth
            </Badge>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground">Login with Telegram</h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Open @PrimeScoreBot, share your phone number, and enter the 6-digit code here. Codes expire in 3 minutes and are one-time use.
            </p>
            <div className="mt-10 space-y-3">
              {[
                { icon: <MessageCircleMore className="h-4 w-4" />, label: "/start in bot" },
                { icon: <Phone className="h-4 w-4" />, label: "Share phone number" },
                { icon: <Smartphone className="h-4 w-4" />, label: "Enter 6-digit code" },
                { icon: <ShieldCheck className="h-4 w-4" />, label: "Session issued" }
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-4 rounded-lg border border-border bg-muted px-4 py-3 transition-colors hover:bg-muted">
                  <div className="rounded-md bg-muted p-2 text-slate-200">{item.icon}</div>
                  <span className="text-sm font-medium text-slate-200">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 lg:p-10 bg-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-2xl">Account access</CardTitle>
            <CardDescription>
              This scaffold keeps the auth flow visible while the backend Telegram integration is being connected.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-0 pb-0">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-5">
              <p className="text-sm font-semibold text-foreground">Debug access</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-muted-foreground">User: azizbek</p>
                <p className="text-sm text-muted-foreground">Name: Azizbek Prime</p>
              </div>
              <Button className="mt-4 w-full" variant="outline" onClick={() => router.push("/dashboard")}>
                Continue as debug user
              </Button>
            </div>

            {step === "request" ? (
              <div className="space-y-4">
                <Input placeholder="Telegram ID or handle placeholder" className="bg-background" />
                <Button className="w-full" onClick={() => setStep("verify")}>
                  Request code
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : null}

            {step === "verify" ? (
              <div className="space-y-4">
                <Input placeholder="Enter 6-digit code" value={code} onChange={(event) => setCode(event.target.value)} className="bg-background text-center tracking-widest text-lg" />
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("request")}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep("done")}>
                    Verify
                  </Button>
                </div>
              </div>
            ) : null}

            {step === "done" ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5">
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">Session ready</p>
                <p className="mt-1 text-sm text-muted-foreground">The front-end scaffold is ready to receive real auth tokens.</p>
                <Button className="mt-4 w-full" onClick={() => router.push("/dashboard")}>
                  Open dashboard
                </Button>
              </div>
            ) : null}
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
