"use client";

import { ArrowRight, BrainCircuit, CountUp, DeviceShowcase, Gauge, LandingFeaturedTest, LineChart, Link, MarketingAuthCta, MarketingPlan, ReactNode, Reveal, ReviewItem, Sora, Sparkles, cn } from "./landing-page-client-dependencies";

export const display = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export interface LandingPageClientProps {
  plans: MarketingPlan[];
  reviews: ReviewItem[];
  totalUsers: number;
  initialTests?: LandingFeaturedTest[];
}

export // Numbered section eyebrow for a consistent editorial rhythm.
function Eyebrow({ no, children }: { no: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className="font-mono text-xs font-semibold text-orange-400/80 dark:text-orange-300/80">{no}</span>
      <span className="h-px w-7 bg-gradient-to-r from-orange-400 to-orange-400/0 dark:from-orange-300" />
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500 dark:text-orange-300">{children}</span>
    </div>
  );
}

export // Decorative rising bars used inside large feature cards.
function MiniBars() {
  return (
    <div className="mt-6 flex h-12 items-end gap-1.5 opacity-70" aria-hidden="true">
      {[40, 62, 52, 78, 70, 92].map((h, i) => (
        <div
          key={i}
          className="w-2.5 rounded-full bg-gradient-to-t from-orange-500/70 to-amber-400/70 dark:from-orange-500/60 dark:to-amber-400/60"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function getFeatures() {
  return [
  {
    Icon: BrainCircuit,
    title: "AI Band Estimate",
    body: "Finish a test and get an honest predicted band with the exact reason behind every lost mark.",
    span: "lg:col-span-3",
    wide: true,
  },
  {
    Icon: Gauge,
    title: "Targeted practice",
    body: "We surface the one skill dragging you down and route you straight into the right set.",
    span: "lg:col-span-2",
    wide: false,
  },
  {
    Icon: LineChart,
    title: "Progress you can read",
    body: "Band movement, timing, and weak topics in one calm view - the next step is never a mystery.",
    span: "lg:col-span-2",
    wide: false,
  },
  {
    Icon: Sparkles,
    title: "Real exam feel",
    body: "Computer-delivered layout, timing, and scoring that mirror the test day experience.",
    span: "lg:col-span-3",
    wide: true,
  },
  ];
}

export function getSteps() {
  return [
    { no: "01", title: "Diagnose", body: "A short exam-style test places your current band across all four skills." },
    { no: "02", title: "Practice", body: "Move into the exact area holding you back, guided from the same path." },
    { no: "03", title: "Rise", body: "Review scores and weak topics, then repeat toward a clear target." },
  ];
}

export // ── Hero ────────────────────────────────────────────────────────────
function Hero() {
  const titleSuffix = "";

  return (
    <section className="relative isolate overflow-hidden bg-white px-2 pb-24 pt-14 dark:bg-slate-950 sm:px-3 sm:pb-32 sm:pt-20">
      {/* aurora background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-aurora absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.26),transparent_62%)] dark:bg-[radial-gradient(circle,rgba(249,115,22,0.22),transparent_62%)]" />
        <div className="animate-aurora-slow absolute -right-32 top-10 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.24),transparent_62%)] dark:bg-[radial-gradient(circle,rgba(251,191,36,0.16),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)] dark:bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,white_88%)] dark:bg-[linear-gradient(to_bottom,transparent,#020617_88%)]" />
      </div>

      <div className="mx-auto grid max-w-[86rem] items-center gap-12 lg:grid-cols-2 lg:gap-10">
        {/* LEFT: copy */}
        <div className="text-center lg:text-left">
          <Reveal as="div" className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50/80 px-3.5 py-1.5 text-[13px] font-medium text-orange-600 shadow-sm backdrop-blur dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-300">
            <span className="premium-live-dot" />
            {"FREE ONLINE IELTS MOCK TESTS"}
          </Reveal>

          <Reveal
            as="div"
            delay={80}
            className={cn(
              display.className,
              "mt-6 text-[2.6rem] font-extrabold leading-[1.03] tracking-[-0.03em] text-slate-900 dark:text-white sm:text-[3.6rem]",
            )}
          >
            <h1>
              {"Prepare for IELTS"}{" "}
              <span className="text-orange-500">
                {"Computer-Based Test"}
              </span>
              {titleSuffix ? <> {titleSuffix}</> : null}
            </h1>
          </Reveal>

          <Reveal as="div" delay={160}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-500 dark:text-slate-400 lg:mx-0">
              {"Take a free diagnostic, see exactly where you lose marks, and practice with AI Feedback - on any device, with every next step crystal clear."}
            </p>
          </Reveal>

          <Reveal as="div" delay={240} className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:items-start lg:justify-start">
            <MarketingAuthCta
              guestLabel={"Start free diagnostic"}
              authLabel={"Go to dashboard"}
              className="animate-sheen relative h-14 overflow-hidden rounded-full bg-orange-500 px-7 text-[15px] font-semibold text-white shadow-[0_24px_50px_-18px_rgba(249,115,22,0.85)] transition-all hover:-translate-y-0.5 hover:bg-orange-600"
            />
            <Link
              href="#pricing"
              className="group flex h-14 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/70 px-7 text-[15px] font-semibold text-slate-800 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:text-orange-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:border-orange-500/40 dark:hover:text-orange-300"
            >
              {"View plans"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>

        </div>

        {/* RIGHT: device showcase */}
        <Reveal as="div" delay={220} className="mt-4 lg:mt-0">
          <DeviceShowcase />
        </Reveal>
      </div>
    </section>
  );
}

export // ── Stats ───────────────────────────────────────────────────────────
function Stats({ totalUsers, publishedCount }: { totalUsers: number; publishedCount: number }) {
  const users = Math.max(0, totalUsers);
  const published = publishedCount > 0 ? publishedCount : 120;

  const items = [
    { node: <CountUp to={users} />, label: "users total" },
    { node: <CountUp to={published} suffix="+" />, label: "Mock Test" },
    { node: <span>4</span>, label: "IELTS skills" },
    { node: <span>7.0+</span>, label: "Band target" },
  ];

  return (
    <section className="bg-white px-2 dark:bg-slate-950 sm:px-3">
      <div className="mx-auto max-w-[86rem]">
        <Reveal className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-200/70 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="bg-white px-6 py-8 text-center dark:bg-slate-900">
              <div className={cn(display.className, "text-4xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white sm:text-5xl")}>
                {item.node}
              </div>
              <p className="mt-2 text-[12px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">{item.label}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
