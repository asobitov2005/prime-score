import type { Metadata } from "next";
import Script from "next/script";
import { Suspense, type ReactNode } from "react";
import { Providers } from "@/app/providers";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { SiteShell } from "@/components/layout/site-shell";
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
                const theme = localStorage.getItem('prime-theme') || 'dark';
                document.documentElement.classList.add(theme);
              } catch (e) {}
            `,
          }}
        />
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      </head>
      <body>
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
            <SiteShell>{children}</SiteShell>
          </SmoothScroll>
        </Providers>
      </body>
    </html>
  );
}
