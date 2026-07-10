"use client";
import type { WritingExamClientScope } from "./controller";
import { AlertTriangle, Button, Expand, FileText, Link, Loader2, Moon, PremiumUpgradeModal, SendHorizontal, Shrink, SunMedium, Textarea, cn, createPortal, trackUiInteraction } from "../dependencies";
import { AutosaveCloud, CustomPrompt, PresetPrompt, WritingLimitPill, formatTime } from "../shared";

export function WritingExamClientView1({ scope }: { scope: WritingExamClientScope }) {
  const { syncState, candidateName, timerIsOvertime, timerDisplaySeconds, theme, updateTheme, isFullscreen, toggleFullscreen, limitStatus, handleSubmit, canSubmit, isSubmitting, showTimeUpDialog, setHasAcknowledgedTimeUp, mounted, showPremiumModal, subscriptionHref, setShowPremiumModal, handlePaneWheel, config, task, resolvedTaskType, topic, handleTopicChange, imageFile, imagePreviewUrl, handleImageChange, submitError, essayRef, essay, handleEssayChange, wordCount } = scope;
  return (
    (
        <div className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground">
          <header className="sticky top-0 z-30 shrink-0 border-b border-border/80 bg-background/95 text-foreground shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <div className="mx-auto grid min-h-[68px] max-w-[1800px] grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/writing"
                  className="flex h-10 items-center rounded-md transition hover:opacity-90"
                  aria-label="Leave writing workspace"
                  title="Leave writing workspace"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/exam-logo-lightmode.svg" alt="PrimeScore" className="h-8 w-auto dark:hidden" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/exam-logo-darkmode.svg" alt="PrimeScore" className="hidden h-8 w-auto dark:block" />
                </Link>
                <div className="min-w-0 border-l border-border pl-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">Test Taker</p>
                  <div className="flex items-center gap-2">
                    <AutosaveCloud syncState={syncState} />
                    <p className="truncate text-sm font-semibold text-foreground">{candidateName}</p>
                  </div>
                </div>
              </div>
    
              <div className="flex items-center justify-center">
                <div
                  className={cn(
                    "rounded-lg px-2 py-1 text-center transition-all",
                    timerIsOvertime && "bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.16)]"
                  )}
                >
                  <p
                    className={cn(
                      "text-[15px] font-bold leading-none tracking-[0.04em] transition-colors",
                      timerIsOvertime ? "text-red-600 dark:text-red-400" : "text-foreground"
                    )}
                  >
                    {formatTime(timerDisplaySeconds)}
                  </p>
                </div>
              </div>
    
              <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  className="h-9 w-9 rounded-lg border-border/70 bg-background p-0"
                  onClick={() => {
                    const nextTheme = theme === "dark" ? "light" : "dark";
                    updateTheme(nextTheme);
                    trackUiInteraction({
                      action: "writing_theme_change",
                      component: "writing_exam_workspace",
                      value: nextTheme,
                    });
                  }}
                >
                  {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
                  className="h-9 w-9 rounded-lg border-border/70 bg-background p-0"
                  onClick={() => void toggleFullscreen()}
                >
                  {isFullscreen ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                </Button>
                <WritingLimitPill limitStatus={limitStatus} />
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!canSubmit || isSubmitting}
                  className={cn(
                    "h-9 rounded-xl px-3 text-[11px] font-semibold uppercase tracking-[0.12em]",
                    theme === "dark"
                      ? "border border-slate-400 bg-slate-300 text-slate-950 hover:bg-slate-200"
                      : "border border-border bg-muted/45 text-slate-700 hover:bg-muted/70"
                  )}
                >
                  {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="mr-1.5 h-3.5 w-3.5" />}
                  {isSubmitting ? "Submitting" : "Submit"}
                </Button>
              </div>
            </div>
          </header>
    
          {showTimeUpDialog ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/35 px-4 backdrop-blur-[2px] animate-in fade-in duration-200">
              <div className="w-full max-w-sm rounded-2xl border border-red-500/20 bg-card/95 p-5 shadow-2xl shadow-black/15 animate-in slide-in-from-bottom-2 zoom-in-95 duration-200">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-foreground">Time is up</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      The recommended time for this task has ended. Continue writing or submit your answer now.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl px-4"
                    onClick={() => setHasAcknowledgedTimeUp(true)}
                  >
                    Continue
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!canSubmit || isSubmitting}
                    className="h-9 rounded-xl px-4"
                  >
                    {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <SendHorizontal className="mr-1.5 h-3.5 w-3.5" />}
                    {isSubmitting ? "Submitting" : "Submit"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
    
          {mounted && showPremiumModal ? createPortal(
            <PremiumUpgradeModal
              title={limitStatus?.is_premium ? "Daily Writing limit reached" : "Premium Writing"}
              description={
                limitStatus?.is_premium
                  ? `You used ${limitStatus.used_today}/${limitStatus.daily_limit ?? 0} Writing checks today. Upgrade your plan to raise the limit, or come back after the daily reset.`
                  : "IELTS Writing feedback is available for Premium members. Upgrade to unlock Writing checks and detailed sentence-level feedback."
              }
              actionLabel={limitStatus?.is_premium ? "Upgrade plan" : "Upgrade to Premium"}
              subscriptionHref={subscriptionHref}
              onClose={() => setShowPremiumModal(false)}
            />,
            document.body,
          ) : null}
    
          <main className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(320px,43%)_minmax(0,57%)]">
            <section className="min-h-0 overflow-hidden border-b border-border/80 bg-background lg:flex lg:border-b-0 lg:border-r">
              <div
                onWheelCapture={handlePaneWheel}
                className="h-full min-h-0 overflow-y-auto py-5 pl-4 pr-5 overscroll-contain sm:pl-6 sm:pr-5"
              >
                <div className="space-y-6">
                <div className="rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 shadow-sm shadow-amber-500/10 dark:border-amber-400/35 dark:bg-amber-500/10">
                  <p className="text-lg font-bold tracking-tight text-foreground">{config.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-100">{config.instruction}</p>
                </div>
    
                {task ? (
                  <PresetPrompt task={task} />
                ) : (
                  <CustomPrompt
                    taskType={resolvedTaskType}
                    topic={topic}
                    onTopicChange={handleTopicChange}
                    imageFile={imageFile}
                    imagePreviewUrl={imagePreviewUrl}
                    onImageChange={handleImageChange}
                  />
                )}
    
              </div>
              </div>
            </section>
    
            <section className="min-h-0 overflow-hidden bg-background lg:flex lg:flex-col">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-1 pt-4 sm:px-6">
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">Your Answer</p>
              </div>
    
              {submitError ? (
                <div className="mx-4 mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300 sm:mx-6">
                  {submitError}
                </div>
              ) : null}
    
              <div
                onWheelCapture={handlePaneWheel}
                className="flex flex-1 min-h-0 overflow-y-auto px-4 pb-4 pt-2 overscroll-contain sm:px-6 sm:pb-6 sm:pt-2"
                style={{ scrollbarGutter: "stable" }}
              >
                <Textarea
                  ref={essayRef}
                  value={essay}
                  onChange={(event) => handleEssayChange(event.target.value)}
                  placeholder="Start writing your answer here"
                  className="h-full min-h-[480px] flex-1 overflow-y-auto resize-none rounded-lg border-border/70 bg-background px-5 py-4 text-[15px] leading-7 focus-visible:border-amber-300/60 focus-visible:ring-2 focus-visible:ring-amber-300/15 lg:min-h-0"
                />
              </div>
              <div className="relative z-10 -mt-5 px-4 pb-4 pt-0 sm:px-6">
                <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Words: <span className="tabular-nums text-foreground">{wordCount}</span>
                </p>
              </div>
            </section>
          </main>
        </div>
      )
  );
}
