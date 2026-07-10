"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { cn } from "../dependencies";

export function ReadingExamPreviewSection9({ scope }: { scope: ReadingExamPreviewScope }) {
  const { updateActiveDialog, theme, syncState, candidateName } = scope;
  return (
    <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateActiveDialog("leave")}
                      className="flex h-10 items-center rounded-md transition hover:opacity-90"
                      aria-label="Leave test"
                      title="Leave test"
                    >
                      <img
                        src={theme === "light" ? "/exam-logo-lightmode.svg" : "/exam-logo-darkmode.svg"}
                        alt="PrimeScore"
                        className="h-8 w-auto"
                      />
                    </button>
                    <div className="min-w-0 border-l border-border pl-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">Test Taker</p>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex h-5 w-5 flex-none items-center justify-center",
                            syncState === "error"
                              ? "text-red-500"
                              : syncState === "saving"
                                ? "text-primary animate-pulse"
                                : "text-primary"
                          )}
                          title={
                            syncState === "error"
                              ? "Save failed"
                              : syncState === "saving"
                                ? "Saving changes"
                                : "Saved"
                          }
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                            <path
                              d="M6.5 18.25C4.01 18.25 2 16.24 2 13.75C2 11.49 3.67 9.62 5.84 9.31C6.6 6.77 8.95 5 11.75 5C15.19 5 18 7.81 18 11.25V11.5H18.5C20.43 11.5 22 13.07 22 15C22 16.93 20.43 18.5 18.5 18.5H6.5V18.25Z"
                              className="stroke-current"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {syncState === "error" ? (
                              <path
                                d="M10.1 10.1L13.9 13.9M13.9 10.1L10.1 13.9"
                                className="stroke-current"
                                strokeWidth="1.9"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            ) : syncState === "saving" ? (
                              <path
                                d="M8.5 13.1L10.2 14.8L13.1 11.9"
                                className="stroke-current"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity="0.6"
                              />
                            ) : (
                              <path
                                d="M8.5 13.1L10.2 14.8L13.1 11.9"
                                className="stroke-emerald-500"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )}
                          </svg>
                        </span>
                        <p className="truncate text-sm font-semibold text-foreground">{candidateName}</p>
                      </div>
                    </div>
                  </div>
  );
}
