"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { Button, LogIn } from "../dependencies";

export function ReadingExamPreviewSection6({ scope }: { scope: ReadingExamPreviewScope }) {
  const { showGuestLoginModal, setShowGuestLoginModal, examData, router } = scope;
  return (
    {showGuestLoginModal && (
                <div
                  className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto"
                  onClick={() => setShowGuestLoginModal(false)}
                >
                  <div
                    className="relative w-full max-w-[340px] overflow-hidden rounded-[1.5rem] border border-border/60 bg-card/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-400"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500" />
                    
                    <div className="p-6 space-y-6">
                      <div className="text-center space-y-3">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 mb-2 shadow-sm">
                          <LogIn className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold tracking-tight text-foreground">
                          Login Required
                        </h3>
                        <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                          Please log in to answer questions and save your progress.
                        </p>
                      </div>
    
                      <div className="flex flex-col gap-2 pt-2">
                        <Button
                          onClick={() => {
                            const returnPath = examData.testSlug ? `/tests/${examData.testSlug}` : (examData.exitHref ?? "/tests");
                            const returnUrl = encodeURIComponent(returnPath);
                            router.push(`/login?returnUrl=${returnUrl}`);
                          }}
                          className="h-10 w-full rounded-xl font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-sm"
                        >
                          Login
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => router.push(examData.exitHref ?? "/tests")}
                          className="h-10 w-full rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                        >
                          Exit
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
  );
}
