"use client";

import { Check, Clock, Crown, Heart, LineChart, Link, MapPinned, MarketingAuthCta, MessageCircle, Reveal, cn } from "./landing-page-client-dependencies";
import { Eyebrow } from "./landing-page-client-part-01";

export function FloatingProductPreviewCards() {
  const progressRows = [
    { label: "Task response", value: 78 },
    { label: "Timing", value: 64 },
    { label: "Vocabulary", value: 86 },
  ];
  const chartBars = [38, 48, 44, 57, 66, 74, 86];
  const skills = [
    { label: "R", value: "8.5" },
    { label: "L", value: "8.0" },
    { label: "W", value: "7.5" },
    { label: "S", value: "8.0" },
  ];
  const weakAreas = [
    {
      Icon: Clock,
      title: "Timing",
      text: "Work on answering more within time",
      badge: "Focus",
      iconClassName: "bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-300",
    },
    {
      Icon: MessageCircle,
      title: "Cohesion",
      text: "Improve linking of ideas",
      badge: "Improve",
      iconClassName: "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300",
    },
    {
      Icon: MapPinned,
      title: "Map labels",
      text: "Practice labeling key features",
      badge: "Practice",
      iconClassName: "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300",
    },
  ];

  return (
    <div className="relative isolate overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-50 to-orange-50/45 p-4 dark:from-slate-950 dark:to-slate-900 sm:p-6">
      <div className="pointer-events-none absolute left-10 top-14 -z-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.2),transparent_68%)] blur-sm dark:bg-[radial-gradient(circle,rgba(249,115,22,0.16),transparent_68%)]" />
      <div className="pointer-events-none absolute bottom-10 right-12 -z-10 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.14),transparent_70%)] blur-sm dark:bg-[radial-gradient(circle,rgba(16,185,129,0.1),transparent_70%)]" />
      <div className="pointer-events-none absolute right-8 top-8 -z-10 h-40 w-40 bg-[radial-gradient(rgba(249,115,22,0.22)_1px,transparent_1px)] opacity-60 [background-size:14px_14px] dark:bg-[radial-gradient(rgba(249,115,22,0.16)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute -bottom-8 left-8 -z-10 h-28 w-64 rounded-[100%] border-t border-orange-200/70 dark:border-orange-500/20" />
      <div className="pointer-events-none absolute -right-8 top-32 -z-10 h-32 w-72 rounded-[100%] border-t border-emerald-200/60 dark:border-emerald-500/20" />

      <div className="relative z-10 grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <div className="grid gap-4">
          <article className="rounded-[22px] border border-orange-100 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.55)] dark:border-orange-500/25 dark:bg-slate-900 dark:shadow-black/30">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{"Overall Band Score"}</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="flex items-end gap-2">
                <span className="text-6xl font-black leading-none tracking-[-0.05em] text-slate-950 dark:text-white">8.0</span>
                <span className="mb-2 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">+0.5</span>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">{"Good"}</span>
            </div>
            <div className="mt-6 space-y-3">
              {progressRows.map((row) => (
                <div key={row.label}>
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>{row.label}</span>
                    <span>{row.value}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: `${row.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{"Skill breakdown"}</p>
            <div className="mt-5 grid grid-cols-4 gap-3">
              {skills.map((skill) => (
                <div key={skill.label} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-[5px] border-orange-200 bg-white text-sm font-black text-slate-950 dark:border-orange-500/35 dark:bg-slate-950 dark:text-white">
                    {skill.label}
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-950 dark:text-white">{skill.value}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="grid gap-4">
          <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{"Band progress"}</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                <LineChart className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-5 grid h-28 grid-cols-7 items-end gap-2">
              {chartBars.map((height, index) => (
                <div key={index} className="flex h-full flex-col justify-end gap-2 text-center">
                  <span className="mx-auto w-full rounded-t-lg bg-gradient-to-t from-orange-500 to-orange-300" style={{ height: `${height}%` }} />
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">{`Test ${index + 1}`}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.5)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{"Weak areas and recommendations"}</p>
            <div className="mt-4 space-y-3">
              {weakAreas.map((area) => {
                const Icon = area.Icon;
                return (
                  <div key={area.title} className="flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3 dark:bg-slate-950/70">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", area.iconClassName)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-slate-900 dark:text-white">{area.title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400">{area.text}</span>
                    </span>
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                      {area.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

export // ── Final CTA ───────────────────────────────────────────────────────
function FinalCta() {
  const bullets = [
    "Full test experience for all 4 skills",
    "Instant Band Estimate and performance report",
    "Personalized recommendations",
  ];

  return (
    <section id="about" className="relative isolate overflow-hidden border-t border-slate-100 bg-[#fbfcfe] px-2 pb-14 pt-24 dark:border-slate-900 dark:bg-slate-950 sm:px-3 sm:pb-16 sm:pt-32">
      <div className="pointer-events-none absolute right-0 top-14 -z-10 h-80 w-80 bg-[radial-gradient(rgba(249,115,22,0.18)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom_left,black,transparent_72%)] dark:bg-[radial-gradient(rgba(249,115,22,0.13)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute -bottom-20 -left-24 -z-10 h-52 w-[28rem] rounded-[100%] border-t border-orange-200/50 dark:border-orange-500/20" />
      <div className="pointer-events-none absolute -bottom-24 right-0 -z-10 h-60 w-[34rem] rounded-[100%] border-t border-slate-200/80 dark:border-slate-800" />

      <div className="mx-auto max-w-[86rem]">
        <Reveal className="text-center">
          <Eyebrow no="05">{"Final step"}</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-slate-950 dark:text-white sm:text-5xl lg:whitespace-nowrap">
            {"Ready to achieve your"} <span className="text-orange-500">{"target band?"}</span>
          </h2>
        </Reveal>

        <Reveal className="mt-10 overflow-hidden rounded-[26px] border border-orange-100 bg-white p-5 shadow-[0_34px_110px_-68px_rgba(15,23,42,0.55)] dark:border-orange-500/20 dark:bg-slate-900/75 dark:shadow-black/30 sm:p-7 lg:p-9">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-500">{"Start for free"}</p>
              <h3 className="mt-4 text-3xl font-black leading-tight tracking-[-0.025em] text-slate-950 dark:text-white sm:text-4xl">
                {"Take Free Tests"}
                <span className="block">{"and get your"} <span className="text-orange-500">{"Band Estimate!"}</span></span>
              </h3>

              <ul className="mt-7 space-y-3.5">
                {bullets.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Check className="h-4 w-4 shrink-0 text-orange-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <MarketingAuthCta
                  guestLabel={"Start Free Tests"}
                  authLabel={"Start Free Tests"}
                  authHref="/tests"
                  className="h-12 rounded-xl bg-orange-500 px-6 text-sm font-bold text-white shadow-[0_20px_38px_-20px_rgba(249,115,22,0.9)] hover:bg-orange-600"
                />
                <Link
                  href="#pricing"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-orange-500/40 dark:hover:bg-orange-500/10"
                >
                  <Crown className="h-4 w-4 text-orange-500" />
                  {"View Premium Plans"}
                </Link>
              </div>

            </div>

            <FloatingProductPreviewCards />
          </div>
        </Reveal>

        <Reveal className="mt-10 text-center">
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">{"Your target band is closer than you think."}</p>
          <p className="mt-2 inline-flex items-center justify-center gap-2 text-lg font-black text-orange-500">
            {"Let's reach it together!"}
            <Heart className="h-4 w-4 fill-orange-500" />
          </p>
        </Reveal>
      </div>
    </section>
  );
}
