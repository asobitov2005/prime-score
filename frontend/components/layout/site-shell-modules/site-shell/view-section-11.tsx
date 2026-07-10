"use client";
import type { SiteShellScope } from "./controller";
import { BookOpen, Headphones, LayoutDashboard, Link, LogOut, Mic, PenSquare, Settings2, trackCtaClick } from "../dependencies";
import { MobileNavLink, MobilePracticeLink } from "../shared";

export function SiteShellSection11({ scope }: { scope: SiteShellScope }) {
  const { isMobileNavOpen, isAppRoute, setIsMobileNavOpen, isAuthenticated, mounted, hasHydrated, handleSignOut } = scope;
  return (
    {isMobileNavOpen && !isAppRoute && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-200 md:hidden"
              onClick={() => setIsMobileNavOpen(false)}
            >
              <div
                className="absolute left-3 right-3 top-[4.25rem] rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl animate-in slide-in-from-top-4 duration-200 dark:border-slate-800 dark:bg-slate-900/95"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-1">
                  <p className="px-3 pt-1 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-500">{"Practice"}</p>
                  <MobilePracticeLink
                    href="/tests?type=reading"
                    label="Reading"
                    description={"Academic IELTS"}
                    icon={<BookOpen className="h-[18px] w-[18px]" />}
                    isAuthenticated={isAuthenticated}
                    onClose={() => setIsMobileNavOpen(false)}
                  />
                  <MobilePracticeLink
                    href="/tests?type=listening"
                    label="Listening"
                    description={"Academic IELTS"}
                    icon={<Headphones className="h-[18px] w-[18px]" />}
                    isAuthenticated={isAuthenticated}
                    onClose={() => setIsMobileNavOpen(false)}
                  />
                  <MobilePracticeLink
                    href="/writing"
                    label="Writing"
                    description={"Task 1 + Task 2"}
                    icon={<PenSquare className="h-[18px] w-[18px]" />}
                    isAuthenticated={isAuthenticated}
                    onClose={() => setIsMobileNavOpen(false)}
                  />
                  <MobilePracticeLink
                    href="/speaking"
                    label="Speaking"
                    description={"Mock online"}
                    icon={<Mic className="h-[18px] w-[18px]" />}
                    isAuthenticated={isAuthenticated}
                    onClose={() => setIsMobileNavOpen(false)}
                  />
    
                  <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />
    
                  <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{"Explore"}</p>
                  <MobileNavLink href="/#features" label={"Features"} isAuthenticated={isAuthenticated} onClose={() => setIsMobileNavOpen(false)} />
                  <MobileNavLink href="/#pricing" label={"Pricing"} isAuthenticated={isAuthenticated} onClose={() => setIsMobileNavOpen(false)} />
                  <MobileNavLink href="/#reviews" label={"Reviews"} isAuthenticated={isAuthenticated} onClose={() => setIsMobileNavOpen(false)} />
                  <MobileNavLink href="/#about" label={"About"} isAuthenticated={isAuthenticated} onClose={() => setIsMobileNavOpen(false)} />
    
                  <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />
    
    
                  {mounted && hasHydrated && isAuthenticated ? (
                    <>
                      <Link
                        href="/dashboard"
                        onClick={() => setIsMobileNavOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-orange-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-slate-50"
                      >
                        <LayoutDashboard className="h-4 w-4" /> {"Dashboard"}
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setIsMobileNavOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-orange-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-orange-500/10 dark:hover:text-slate-50"
                      >
                        <Settings2 className="h-4 w-4" /> {"Settings"}
                      </Link>
                      <button
                        onClick={() => {
                          setIsMobileNavOpen(false);
                          handleSignOut();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-bold text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" /> {"Sign Out"}
                      </button>
                    </>
                  ) : mounted && hasHydrated ? (
                    <Link
                      href="/login"
                      onClick={() => {
                        trackCtaClick({
                          ctaName: "mobile_login",
                          ctaLabel: "Login",
                          ctaLocation: "mobile_nav",
                          destination: "/login",
                          authState: "guest",
                        });
                        setIsMobileNavOpen(false);
                      }}
                      className="mt-1 flex h-11 items-center justify-center rounded-full bg-orange-500 px-3 text-sm font-semibold text-white shadow-[0_20px_40px_-18px_rgba(249,115,22,0.85)] transition-all active:scale-[0.98]"
                    >
                      {"Login"}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          )}
  );
}
