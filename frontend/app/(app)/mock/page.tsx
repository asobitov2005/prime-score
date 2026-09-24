import type { Metadata } from "next";
import { MockSessions } from "@/components/marketing/mock-sessions";
import { landingFont } from "@/components/marketing/landing-font";

export const metadata: Metadata = {
  title: "Mock sessions",
  robots: { index: false, follow: false },
};

export default async function MockPage({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  const initialMode = searchParams.mode === "offline" || searchParams.mode === "online"
    ? searchParams.mode
    : undefined;

  return (
    <div className={`${landingFont.className} pb-10`}>
      <MockSessions initialMode={initialMode} />
    </div>
  );
}
