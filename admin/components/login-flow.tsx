"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminAuthResponse, setAdminSessionCookies } from "@/lib/auth";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";

const adminApiBaseUrl = (process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL ?? "http://127.0.0.1:8000/api/admin").replace(/\/$/, "");

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
        setMessage("Noto'g'ri login yoki parol kiritildi.");
        return;
      }

      const payload = (await response.json()) as AdminAuthResponse;
      setAdminSessionCookies(payload);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMessage("Serverga ulanishda xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-md space-y-8">
        
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            PrimeScore himoyalangan tizim
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Boshqaruv Paneli
          </h1>
          <p className="text-sm text-muted-foreground">
            Tizimga kirish uchun admin ma'lumotlarini kiriting
          </p>
        </div>

        <Card className="border border-border shadow-xl shadow-black/5">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Avtorizatsiya</CardTitle>
            <CardDescription>
              Login sifatida admin yoki email ishlating
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="login">Login yoki email</Label>
                <Input
                  id="login"
                  value={login}
                  onChange={(event) => setLogin(event.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="bg-background"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Parol</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="bg-background"
                />
              </div>

              {message && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  {message}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isSubmitting || !login.trim() || !password.trim()} 
                className="mt-4 w-full group"
              >
                {isSubmitting ? "Kuzatilmoqda..." : "Tizimga kirish"}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground">
          PrimeScore &copy; {new Date().getFullYear()} Barcha huquqlar himoyalangan.
        </p>
      </div>
    </div>
  );
}
