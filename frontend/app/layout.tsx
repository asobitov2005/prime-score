import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Providers } from "@/app/providers";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { GoogleTagManager } from "@/components/analytics/google-tag-manager";
import { RouteShell } from "@/components/layout/route-shell";
import { SmoothScroll } from "@/components/smooth-scroll";
import { buildDefaultMetadata } from "@/lib/seo";
import "@/app/globals.css";

const GTM_ID = "GTM-PZ4JMVXT";

export const metadata: Metadata = buildDefaultMetadata();

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('prime-theme') || 'light';
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <GoogleTagManager id={GTM_ID} />
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <Providers>
          <SmoothScroll>
            <RouteShell>{children}</RouteShell>
          </SmoothScroll>
        </Providers>
      </body>
    </html>
  );
}
