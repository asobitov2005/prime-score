"use client";
import type { LoginPageClientScope } from "./controller";
import { Check, Link, cn } from "../dependencies";
import { display } from "../shared";

export function LoginPageClientSection3({ scope }: { scope: LoginPageClientScope }) {
  return (
    <aside className="relative hidden overflow-hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
            <div className="pointer-events-none absolute inset-0">
              <div className="animate-aurora absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.4),transparent_62%)]" />
              <div className="animate-aurora-slow absolute -bottom-24 -right-16 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.28),transparent_62%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
            </div>
    
            <Link href="/" className="relative flex items-center gap-2.5">
              {/* brand panel is always dark → use dark-mode logo assets */}
              <img src="/logo.svg" alt="PrimeScore" className="h-8 w-auto object-contain" />
              <span className="flex h-9 items-center" aria-hidden="true">
                <img src="/exam-logo-darkmode.svg" alt="" className="h-full w-auto object-contain" />
              </span>
            </Link>
    
            <div className="relative">
              <h2 className={cn(display.className, "max-w-md text-4xl font-extrabold leading-[1.05] tracking-[-0.02em] text-white xl:text-5xl")}>
                {"Turn Practice Into\u00a0"}
                <span className="text-orange-400">{"Results."}</span>
              </h2>
              <p className="mt-3 max-w-sm text-lg font-semibold leading-7 text-orange-400">
                {"Practice. Score. Succeed."}
              </p>
    
              <ul className="mt-8 space-y-3">
                {[
                  "AI Band Estimate on every test",
                  "Practice that targets weak skills",
                  "Progress synced across devices",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[15px] text-slate-300">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
    
            <p className="relative text-[13px] text-slate-500">© {new Date().getFullYear()} PrimeScore — IELTS mock platform</p>
          </aside>
  );
}
