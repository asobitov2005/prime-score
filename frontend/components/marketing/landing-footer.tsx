import Link from "next/link";
import { Instagram, Send } from "lucide-react";

const TELEGRAM_CHANNEL_URL = "https://t.me/PrimeScoreUz";

const practiceLinks = [
  { label: "Reading Mocks", href: "/tests?type=reading" },
  { label: "Listening Mocks", href: "/tests?type=listening" },
  { label: "Writing Practice", href: "/writing" },
  { label: "Speaking Practice", href: "/speaking" },
  { label: "Full Mock Tests", href: "/tests" },
] as const;

const platformLinks = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "AI Writing Feedback", href: "/writing" },
  { label: "Performance Dashboard", href: "/analytics" },
  { label: "FAQ", href: "/#about" },
] as const;

function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[#D8D2C4]">
        {title}
      </h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-[15px] leading-6 text-[#94A3B8] transition-colors hover:text-orange-500"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="relative overflow-hidden bg-[#050B16] text-[#F8FAFC]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.12),transparent_42%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]"
      />

      <div className="relative mx-auto max-w-[1320px] px-6 pb-6 pt-12 sm:px-8 lg:px-10">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1fr)] xl:gap-12">
          <div className="max-w-[360px]">
            <p className="text-[19px] font-bold tracking-tight">
              <span className="text-[#F8FAFC]">Prime</span>
              <span className="text-orange-500">Score</span>
            </p>

            <p className="mt-4 max-w-[320px] text-[15px] leading-[1.55] text-[#94A3B8]">
              Online IELTS mock test platform. Practice like it&apos;s the real exam. Improve your band score with focused preparation.
            </p>
          </div>

          <FooterLinkGroup title="PRACTICE" links={practiceLinks} />
          <FooterLinkGroup title="PLATFORM" links={platformLinks} />

          <div>
            <h3 className="mb-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[#D8D2C4]">
              CONTACT
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href={TELEGRAM_CHANNEL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-[15px] leading-6 text-[#94A3B8] transition-colors hover:text-orange-500"
                >
                  <Send className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  <span>PrimeScoreUz</span>
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/PrimeScoreUz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-[15px] leading-6 text-[#94A3B8] transition-colors hover:text-orange-500"
                >
                  <Instagram className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                  <span>PrimeScoreUz</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 h-px w-full bg-white/[0.08]" />
        <p className="mt-5 text-center text-[13px] text-[#64748B]">
          © 2026 PrimeScore. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
