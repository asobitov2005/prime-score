import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/server-auth";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const admin = await getAuthenticatedAdmin();
  if (admin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen px-4 py-10 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-7xl items-center">
        {children}
      </div>
    </div>
  );
}
