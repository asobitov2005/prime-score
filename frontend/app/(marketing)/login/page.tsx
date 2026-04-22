import type { Metadata } from "next";
import { LoginPageClient } from "@/components/marketing/login-page-client";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to PrimeScore through Telegram to access IELTS Reading and Listening practice tests.",
  alternates: {
    canonical: absoluteUrl("/login"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
