"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminStore } from "@/store/admin-store";
import { ShieldCheck, Eye, EyeOff, LayoutDashboard, LogOut } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api";

export default function AdminLoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { setSession, clearSession, isAuthenticated, role } = useAdminStore();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.replace("/admin/dashboard");
    }
  }, [mounted, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail ?? "Login yoki parol noto'g'ri.");
        return;
      }
      const data = await res.json();
      setSession({
        adminId: data.admin?.id ?? "",
        role: data.admin?.role ?? "admin",
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
      router.push("/admin/dashboard");
    } catch {
      setError("Server bilan bog'lanib bo'lmadi.");
    } finally {
      setLoading(false);
    }
  };

  if (mounted && isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="text-center space-y-3 pb-6">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-primary flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-black">Allaqachon kirgansiz</CardTitle>
            <CardDescription className="font-medium">
              {role === "super_admin" ? "Super Admin" : "Admin"} sifatida tizimdasiz
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push("/admin/dashboard")}
              className="w-full h-11 rounded-xl font-bold gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboardga o'tish
            </Button>
            <Button
              variant="ghost"
              onClick={() => clearSession()}
              className="w-full h-11 rounded-xl font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-2"
            >
              <LogOut className="h-4 w-4" />
              Chiqish
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="text-center space-y-3 pb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary flex items-center justify-center">
            <ShieldCheck className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-black">Admin Panel</CardTitle>
          <CardDescription className="font-medium">PrimeScore boshqaruv paneliga kirish</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Login</label>
              <Input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="admin login"
                className="h-11 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Parol</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-xl pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full h-11 rounded-xl font-bold" disabled={loading}>
              {loading ? "Kirish..." : "Kirish"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
