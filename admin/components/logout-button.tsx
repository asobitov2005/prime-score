"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { clearAdminSessionCookies } from "@/lib/auth";
import { Button } from "@/components/ui";

export function LogoutButton() {
  const router = useRouter();

  function handleLogout() {
    clearAdminSessionCookies();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleLogout} className="gap-2">
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  );
}
