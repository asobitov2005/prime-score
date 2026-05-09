"use client";

import Link from "next/link";
import { LockKeyhole, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

interface ExamPreviewAccessGateProps {
  kind: "reading" | "listening" | "writing";
  backHref: string;
}

export function ExamPreviewAccessGate({ kind, backHref }: ExamPreviewAccessGateProps) {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isGuest = hasHydrated && !isAuthenticated;
  const title = isGuest ? "Login required" : "Access not found";
  const description = isGuest
    ? `Login with Telegram to open this ${kind} exam preview and save your progress.`
    : `This ${kind} preview could not be opened. Start it again from the test page.`;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm">
        <section className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl">
          <div className="h-1 bg-primary" />
          <div className="space-y-5 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <LockKeyhole className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm leading-6 text-slate-300">{description}</p>
            </div>

            <div className="space-y-2">
              <Button asChild className="h-11 w-full rounded-xl font-semibold">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  {isGuest ? "Login with Telegram" : "Login again"}
                </Link>
              </Button>

              <Button asChild variant="ghost" className="h-10 w-full rounded-xl text-slate-300 hover:text-white">
                <Link href={backHref}>Go back</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
