"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { Badge, Button, cn } from "../dependencies";

export function ReadingExamPreviewSection5({ scope }: { scope: ReadingExamPreviewScope }) {
  const { activeDialog, dismissActiveDialogFromBackdrop, unansweredCount, fullscreenDialogStage, fullscreenExitCountdown, updateActiveDialog, confirmSubmit, setFullscreenDialogStage, confirmFullscreenExit, recoverFullscreen, submitAttempt, confirmLeave } = scope;
  return (
    {activeDialog ? (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200"
                  onClick={dismissActiveDialogFromBackdrop}
                >
                  <div
                    className="relative w-full max-w-[340px] overflow-hidden rounded-3xl border border-border/60 bg-card/95 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in zoom-in-95 duration-300"
                    onClick={(event) => event.stopPropagation()}
                  >
                    
                    <div className={cn(
                      "absolute top-0 left-0 right-0 h-1",
                      activeDialog === "submit" && unansweredCount > 0 ? "bg-red-500" :
                      activeDialog === "submit" ? "bg-emerald-500" :
                      activeDialog === "fullscreen" ? "bg-amber-500" : "bg-red-500"
                    )} />
    
                    <div className="p-5 space-y-5">
                      <div className="text-center space-y-2">
                        <Badge className={cn(
                          "mx-auto rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest shadow-none border-0 mb-3",
                          activeDialog === "submit" && unansweredCount > 0 ? "bg-red-500/10 text-red-600 dark:text-red-400" :
                          activeDialog === "submit" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                          activeDialog === "fullscreen" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-red-500/10 text-red-600 dark:text-red-400"
                        )}>
                          {activeDialog === "submit"
                            ? (unansweredCount > 0 ? "Warning" : "Submit")
                            : activeDialog === "fullscreen"
                              ? "Focus Required"
                              : "Leave"}
                        </Badge>
                        <h3 className="text-lg font-bold tracking-tight text-foreground">
                          {activeDialog === "submit"
                            ? unansweredCount > 0 ? "Unanswered Questions" : "Ready to Submit?"
                            : activeDialog === "fullscreen"
                              ? fullscreenDialogStage === "confirm-exit" ? "Exit & Submit?" : "Return to Full Screen"
                              : "Leave Attempt?"}
                        </h3>
                        <p className="text-xs font-medium leading-relaxed text-muted-foreground">
                          {activeDialog === "submit"
                            ? unansweredCount > 0
                              ? `You have ${unansweredCount} question${unansweredCount === 1 ? "" : "s"} left. Are you sure?`
                              : "Submit now to lock in your score."
                            : activeDialog === "fullscreen"
                              ? fullscreenDialogStage === "confirm-exit"
                                ? "Leaving full screen will submit your attempt."
                                : "Please return to full screen."
                              : "Your progress will be lost if you leave."}
                        </p>
                      </div>
    
                      {activeDialog === "fullscreen" && fullscreenDialogStage !== "confirm-exit" && (
                        <div className="flex justify-center">
                          <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xl font-bold border border-amber-500/20">
                            00:{fullscreenExitCountdown.toString().padStart(2, '0')}
                          </div>
                        </div>
                      )}
    
                      <div className="flex flex-col gap-2 pt-1">
                        {activeDialog === "submit" ? (
                          <>
                            <Button
                              type="button"
                              className="h-11 w-full rounded-xl font-bold shadow-sm transition-all bg-foreground text-background hover:bg-foreground/90"
                              onClick={() => updateActiveDialog(null)}
                            >
                              Go back to test
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className={cn(
                                "h-10 w-full rounded-xl text-xs font-semibold transition-all hover:bg-muted/50",
                                unansweredCount > 0 ? "text-red-500 hover:text-red-600" : "text-emerald-500 hover:text-emerald-600"
                              )}
                              onClick={confirmSubmit}
                            >
                              Yes, submit anyway
                            </Button>
                          </>
                        ) : activeDialog === "fullscreen" ? (
                          fullscreenDialogStage === "confirm-exit" ? (
                            <>
                              <Button
                                type="button"
                                className="h-11 w-full rounded-xl font-bold shadow-sm transition-all bg-foreground text-background hover:bg-foreground/90"
                                onClick={() => {
                                  updateActiveDialog(null);
                                  setFullscreenDialogStage(null);
                                }}
                              >
                                Stay in full screen
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-10 w-full rounded-xl text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-muted/50 transition-all dark:text-amber-500"
                                onClick={() => void confirmFullscreenExit()}
                              >
                                Exit & Submit
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                className="h-11 w-full rounded-xl font-bold shadow-sm transition-all bg-foreground text-background hover:bg-foreground/90"
                                onClick={() => void recoverFullscreen()}
                              >
                                Return to Full Screen
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-10 w-full rounded-xl text-xs font-semibold text-amber-600 hover:text-amber-700 hover:bg-muted/50 transition-all dark:text-amber-500"
                                onClick={() => void submitAttempt("exit_fullscreen")}
                              >
                                Submit now
                              </Button>
                            </>
                          )
                        ) : (
                          <>
                            <Button
                              type="button"
                              className="h-11 w-full rounded-xl font-bold shadow-sm transition-all bg-foreground text-background hover:bg-foreground/90"
                              onClick={() => updateActiveDialog(null)}
                            >
                              Stay in test
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-10 w-full rounded-xl text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-muted/50 transition-all"
                              onClick={confirmLeave}
                            >
                              Leave test
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
  );
}
