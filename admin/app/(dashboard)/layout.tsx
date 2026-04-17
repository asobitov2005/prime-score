import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin-shell";
import { getAuthenticatedAdmin } from "@/lib/server-auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    redirect("/login");
  }

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
