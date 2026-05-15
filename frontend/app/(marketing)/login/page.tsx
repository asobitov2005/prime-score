import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPageClient } from "@/components/marketing/login-page-client";
import { AppLoadingPlaceholder } from "@/components/layout/app-loading-placeholder";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to PrimeScore through Telegram to access IELTS mock tests online, Writing feedback, and IELTS practice tools.",
  alternates: {
    canonical: absoluteUrl("/login"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<AppLoadingPlaceholder mode="overlay" />}>
      <LoginPageClient />
    </Suspense>
  );
}
