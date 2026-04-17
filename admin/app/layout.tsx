import type { Metadata } from "next";
import { PropsWithChildren } from "react";
import { AdminProviders } from "@/components/admin-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrimeScore Admin | Control Panel",
  description: "PrimeScore administration panel"
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased selection:bg-primary/30">
        <AdminProviders>
          <div className="min-h-screen">
            {children}
          </div>
        </AdminProviders>
      </body>
    </html>
  );
}
