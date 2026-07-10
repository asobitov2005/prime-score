"use client";
import type { TestEditorWizardScope } from "./controller";
import { Button, ContentPanel, QuestionsPanel, SectionHeader, cn } from "../dependencies";
import { MetadataPanel, ReviewPanel, stepLabel, stepOrder } from "../shared";

export function TestEditorWizardView1({ scope }: { scope: TestEditorWizardScope }) {
  const { mode, draft, isPublishedEdit, saveState, saveErrorMessage, resolvedTestId, quickFixPublished, publishState, saveDraft, activeStep, publishDraft, activeStepIndex, setActiveStep, setDraft } = scope;
  return (
    (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
            <SectionHeader
              eyebrow={mode === "create" ? "Create test" : "Edit test"}
              title={mode === "create" ? "Professional Test Builder" : `Editing: ${draft.metadata.title}`}
              description="Build structured reading and listening tests with real-time user preview."
            />
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="mr-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                {isPublishedEdit ? (
                  <span className="whitespace-nowrap rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-warning">
                    Quick Fix updates live. New Version creates a draft.
                  </span>
                ) : null}
                {saveState === "saving" && (
                  <span className="flex items-center gap-1.5 text-primary animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Saving...
                  </span>
                )}
                {saveState === "saved" && (
                  <span className="flex items-center gap-1 text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Saved
                  </span>
                )}
                {saveState === "error" && <span className="text-destructive">{saveErrorMessage ?? "Save failed"}</span>}
                {saveState === "idle" && resolvedTestId && <span>Up to date</span>}
              </div>
    
              {isPublishedEdit ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void quickFixPublished()}
                    disabled={saveState === "saving" || publishState === "publishing" || !resolvedTestId}
                  >
                    Quick Fix
                  </Button>
                  <Button
                    type="button"
                    variant="solid"
                    size="sm"
                    onClick={() => void saveDraft(false)}
                    disabled={saveState === "saving" || publishState === "publishing"}
                  >
                    New Version
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => void saveDraft(false)}>
                  Force Save
                </Button>
              )}
    
              {activeStep === "review" ? (
                !isPublishedEdit ? (
                  <Button type="button" variant="solid" size="sm" onClick={() => void publishDraft()} disabled={publishState === "publishing" || saveState === "saving"}>
                    {publishState === "publishing" ? "Publishing..." : publishState === "published" ? "Published" : publishState === "error" ? "Publish failed" : "Publish Test"}
                  </Button>
                ) : null
              ) : (
                <Button type="button" variant="solid" size="sm" onClick={() => {
                  const next = stepOrder[activeStepIndex + 1];
                  if (next) setActiveStep(next);
                }}>
                  Next step →
                </Button>
              )}
            </div>
          </div>
    
          {/* Horizontal Progress Bar */}
          <div className="bg-muted/30 p-1 rounded-xl border border-border flex items-center gap-1 overflow-x-auto no-scrollbar">
            {stepOrder.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setActiveStep(step)}
                className={cn(
                  "flex-1 min-w-[140px] flex items-center justify-center gap-3 px-4 py-3 rounded-lg transition-all font-bold text-sm uppercase tracking-wider",
                  activeStep === step 
                    ? "bg-background text-primary shadow-sm border border-primary/20" 
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
              >
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2",
                  activeStep === step ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                )}>
                  {index + 1}
                </span>
                {stepLabel(step)}
              </button>
            ))}
          </div>
    
          <div className="w-full min-w-0 pt-2">
            {activeStep === "metadata" ? <MetadataPanel draft={draft} setDraft={setDraft} /> : null}
            {activeStep === "content" ? <ContentPanel draft={draft} setDraft={setDraft} /> : null}
            {activeStep === "questions" ? <QuestionsPanel draft={draft} setDraft={setDraft} /> : null}
            {activeStep === "review" ? <ReviewPanel draft={draft} /> : null}
          </div>
        </div>
      )
  );
}
