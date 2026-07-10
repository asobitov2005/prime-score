"use client";
import type { AppShellScope } from "./controller";
import { AppLoadingPlaceholder, Button, ExamRouteLoadingFrame, Menu, PremiumUpgradeModal, SidebarPremiumCard, X, cn, trackUiInteraction } from "../dependencies";

export function AppShellView1({ scope }: { scope: AppShellScope }) {
  const { setIsMobileOpen, isMobileOpen, SidebarBrand, SidebarContent, sidebar, SidebarNavigation, isPendingExamPreview, pendingNavigationHref, pendingNavigationPathname, children, showAnalyticsPremiumModal, subscriptionHref, setShowAnalyticsPremiumModal } = scope;
  return (
    (
        <div className="relative flex w-full flex-1 flex-col items-start bg-[#F8FAFC] px-4 pb-6 pt-3 transition-colors sm:px-6 md:pb-8 md:pt-4 lg:flex-row lg:gap-0 lg:px-0 lg:py-0 dark:bg-slate-950">
          {/* Mobile Sidebar Toggle Button - Floating because header is global */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              trackUiInteraction({
                action: "mobile_sidebar_open",
                component: "app_shell",
              });
              setIsMobileOpen(true);
            }}
            className="lg:hidden fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-blue-600 text-white shadow-xl border-none hover:bg-blue-700 active:scale-95"
            aria-label="Open Menu"
          >
            <Menu className="h-6 w-6" />
          </Button>
    
          {isMobileOpen && (
            <div
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
              onClick={() => setIsMobileOpen(false)}
            />
          )}
    
          <div className={cn(
            "fixed inset-y-0 left-0 z-50 w-[17.5rem] bg-white p-5 shadow-2xl flex flex-col gap-5 lg:hidden transition-transform duration-300 ease-out dark:bg-slate-950 dark:text-slate-100",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="flex items-center justify-between pb-2">
              <SidebarBrand />
              <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)} className="h-8 w-8 rounded-full hover:bg-muted/50 -mr-2">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pb-6 no-scrollbar">
              <SidebarContent />
            </div>
          </div>
    
          <aside className={cn(
            "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block w-[16.5rem] shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
            sidebar === "collapsed" ? "lg:hidden" : "lg:block"
          )}>
            <div className="flex h-full flex-col gap-4 p-4">
              <SidebarBrand />
              <div
                className={cn(
                  "flex-1 min-h-0 overscroll-contain scroll-smooth flex flex-col gap-4 overflow-y-auto no-scrollbar",
                )}
                style={{
                  scrollbarGutter: "stable"
                }}
              >
                <SidebarNavigation />
              </div>
              <div className="shrink-0">
                <SidebarPremiumCard />
              </div>
            </div>
          </aside>
    
          <main className="min-w-0 flex-1 w-full animate-in fade-in duration-500 ease-out lg:ml-[16.5rem] lg:px-5 lg:py-5 xl:px-6">
            <div className="mx-auto w-full max-w-[82rem]">
              {isPendingExamPreview ? (
                <ExamRouteLoadingFrame />
              ) : pendingNavigationHref ? (
                <AppLoadingPlaceholder
                  pathname={pendingNavigationPathname ?? undefined}
                  className="min-h-[calc(100vh-7rem)] px-0 py-0"
                />
              ) : (
                children
              )}
            </div>
          </main>
    
          {showAnalyticsPremiumModal ? (
            <PremiumUpgradeModal
              title="Analytics is Premium"
              description="Detailed analytics and skill insights are available for Premium users."
              subscriptionHref={subscriptionHref}
              onClose={() => setShowAnalyticsPremiumModal(false)}
            />
          ) : null}
        </div>
      )
  );
}
