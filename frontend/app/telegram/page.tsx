import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";

import { AppLoadingPlaceholder } from "@/components/layout/app-loading-placeholder";
import { TelegramWebAppLogin } from "@/components/telegram/telegram-webapp-login";
import { absoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Telegram Mini App Login",
  description: "Open PrimeScore through the Telegram Mini App and sign in securely with your Telegram account.",
  alternates: {
    canonical: absoluteUrl("/telegram"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function TelegramPage() {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <Suspense fallback={<AppLoadingPlaceholder mode="overlay" />}>
        <TelegramWebAppLogin />
      </Suspense>
    </>
  );
}
