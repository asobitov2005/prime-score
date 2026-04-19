"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { useAdminStore } from "@/store/admin-store";

interface AdminPanelLayoutProps {
  children: ReactNode;
}

export default function AdminPanelLayout({ children }: AdminPanelLayoutProps) {
  const { isAuthenticated, clearSession } = useAdminStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/admin/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm font-medium">Yuklanmoqda...</div>
      </div>
    );
  }

  const handleLogout = () => {
    clearSession();
    router.push("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <AdminSidebar onLogout={handleLogout} />
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
