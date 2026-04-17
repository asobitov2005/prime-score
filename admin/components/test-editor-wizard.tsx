"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Notice, ProgressBar, SectionHeader, Select, Textarea } from "@/components/ui";
import { createEmptyDraft } from "@/lib/draft-template";
import { listeningQuestionTypes, readingQuestionTypes } from "@/lib/question-types";
import { adminApi } from "@/lib/api";
import type { AdminDraftChecklistStatus, AdminTestDraftState, PreviewMode, WizardStepId } from "@/lib/types";
import { cn } from "@/lib/utils";


type Props = {
  mode: "create" | "edit";
  testId?: string;
  initialDraft?: AdminTestDraftState;
};


const stepOrder: WizardStepId[] = ["metadata", "content", "questions", "review"];

const defaultInstructions: Record<string, string> = {
  // Reading Instructions
  "reading_true_false_not_given": "Do the following statements agree with the information given in the Reading Passage?\n\nIn boxes on your answer sheet, write:\n\nTRUE if the statement agrees with the information\nFALSE if the statement contradicts the information\nNOT GIVEN if there is no information on this",
  "reading_yes_no_not_given": "Do the following statements agree with the claims of the writer in the Reading Passage?\n\nIn boxes on your answer sheet, write:\n\nYES if the statement agrees with the claims of the writer\nNO if the statement contradicts the claims of the writer\nNOT GIVEN if it is impossible to say what the writer thinks about this",
  "reading_mc_single": "Choose the correct letter, A, B, C or D.\n\nWrite the correct letter in boxes on your answer sheet.",
  "reading_mc_multiple": "Choose TWO letters, A-E.\n\nWrite the correct letters in boxes on your answer sheet.",
  "reading_matching_headings": "Choose the correct heading for each paragraph from the list of headings below.\n\nWrite the correct number, i-ix, in boxes on your answer sheet.",
  "reading_matching_information": "Which paragraph contains the following information?\n\nWrite the correct letter, A-F, in boxes on your answer sheet.\n\nNB You may use any letter more than once.",
  "reading_matching_features": "Look at the following statements and the list of people below.\n\nMatch each statement with the correct person.\n\nWrite the correct letter, A-E, in boxes on your answer sheet.",
  "reading_matching_sentence_endings": "Complete each sentence with the correct ending, A-G, below.\n\nWrite the correct letter, A-G, in boxes on your answer sheet.",
  "reading_sentence_completion": "Complete the sentences below.\n\nChoose ONE WORD ONLY from the passage for each answer.\n\nWrite your answers in boxes on your answer sheet.",
  "reading_summary_completion_wordbank": "Complete the summary using the list of words, A-G, below.\n\nWrite the correct letter, A-G, in boxes on your answer sheet.",
  "reading_summary_completion_freetext": "Complete the summary below.\n\nChoose ONE WORD ONLY from the passage for each answer.\n\nWrite your answers in boxes on your answer sheet.",
  "reading_note_completion": "Complete the notes below.\n\nChoose ONE WORD ONLY from the passage for each answer.\n\nWrite your answers in boxes on your answer sheet.",
  "reading_diagram_labeling": "Label the diagram below.\n\nChoose ONE WORD ONLY from the passage for each answer.\n\nWrite your answers in boxes on your answer sheet.",
  "reading_short_answer": "Answer the questions below.\n\nChoose NO MORE THAN TWO WORDS AND/OR A NUMBER from the passage for each answer.\n\nWrite your answers in boxes on your answer sheet.",

  // Listening Instructions
  "listening_form_completion": "Complete the form below.\n\nWrite NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
  "listening_sentence_completion": "Complete the sentences below.\n\nWrite NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
  "listening_mc_single": "Choose the correct letter, A, B or C.",
  "listening_mc_multiple": "Choose TWO letters, A-E.",
  "listening_matching": "What does the speaker say about each of the following items?\n\nChoose the correct letter, A, B or C, and write them next to Questions.",
  "listening_plan_map_labeling": "Label the map below.\n\nWrite the correct letter, A-H, next to Questions.",
  "listening_short_answer": "Answer the questions below.\n\nWrite NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer."
};


export function TestEditorWizard({ mode, testId, initialDraft }: Props) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState<WizardStepId>("metadata");
  const draftSeed = useMemo(() => initialDraft ?? createEmptyDraft(), [initialDraft]);
  const [draft, setDraft] = useState<AdminTestDraftState>(draftSeed);
  const [resolvedTestId, setResolvedTestId] = useState<string | undefined>(testId);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishState, setPublishState] = useState<"idle" | "publishing" | "published" | "error">("idle");
  const activeStepIndex = stepOrder.indexOf(activeStep);
  const completionRatio = ((activeStepIndex + 1) / stepOrder.length) * 100;

  // Auto-Save Effect (Debounced)
  useEffect(() => {
    // Skip auto-save on initial load if we don't have changes or if it's already saving
    if (saveState === "saving" || publishState === "publishing") return;

    const handler = setTimeout(() => {
      // Don't auto-save an empty draft title or an initial unsaved create view immediately
      if (draft.metadata.title.trim().length > 0) {
        void saveDraft(true); // pass true for "silent" auto-save
      }
    }, 2000);

    return () => {
      clearTimeout(handler);
    };
  }, [draft]); // Trigger whenever draft changes

  useEffect(() => {
    setDraft(draftSeed);
  }, [draftSeed]);

  async function saveDraft(isAutoSave = false) {
    try {
      setSaveState("saving");
      const saved = resolvedTestId
        ? await adminApi.updateDraft(resolvedTestId, draft)
        : await adminApi.createDraft(draft);
      setResolvedTestId(saved.id);
      setDraft((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          version: saved.version,
          status: saved.status
        }
      }));
      setSaveState("saved");
      if (!testId && !isAutoSave) {
        router.replace(`/tests/${saved.id}/edit`);
      } else if (!testId && isAutoSave) {
        // Change URL without full navigation for auto-saves
        window.history.replaceState(null, "", `/tests/${saved.id}/edit`);
      }
      
      // Reset saved state indicator to idle after 3 seconds for clean UI
      setTimeout(() => {
        setSaveState(current => current === "saved" ? "idle" : current);
      }, 3000);
    } catch {
      setSaveState("error");
    }
  }

  async function publishDraft() {
    let targetTestId = resolvedTestId;
    if (!targetTestId) {
      try {
        setSaveState("saving");
        const saved = await adminApi.createDraft(draft);
        targetTestId = saved.id;
        setResolvedTestId(saved.id);
        setDraft((current) => ({
          ...current,
          metadata: {
            ...current.metadata,
            version: saved.version,
            status: saved.status
          }
        }));
        setSaveState("saved");
        router.replace(`/tests/${saved.id}/edit`);
      } catch {
        setSaveState("error");
        return;
      }
    }
    if (!targetTestId) {
      return;
    }

    try {
      setPublishState("publishing");
      const published = await adminApi.publishTest(targetTestId);
      setDraft((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          status: published.status,
          version: published.version
        }
      }));
      setPublishState("published");
    } catch {
      setPublishState("error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <SectionHeader
          eyebrow={mode === "create" ? "Create test" : "Edit test"}
          title={mode === "create" ? "Professional Test Builder" : `Editing: ${draft.metadata.title}`}
          description="Build structured reading and listening tests with real-time user preview."
        />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mr-2">
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
            {saveState === "error" && <span className="text-destructive">Save failed</span>}
            {saveState === "idle" && resolvedTestId && <span>Up to date</span>}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={() => void saveDraft(false)}>
            Force Save
          </Button>

          {activeStep === "review" ? (
            <Button type="button" variant="solid" size="sm" onClick={() => void publishDraft()} disabled={publishState === "publishing" || saveState === "saving"}>
              {publishState === "publishing" ? "Publishing..." : publishState === "published" ? "Published" : publishState === "error" ? "Publish failed" : "Publish Test"}
            </Button>
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
  );
}


function MetadataPanel({
  draft,
  setDraft
}: {
  draft: AdminTestDraftState;
  setDraft: React.Dispatch<React.SetStateAction<AdminTestDraftState>>;
}) {
  return (
    <Card className="border-primary/10 shadow-sm">
      <CardHeader className="border-b bg-muted/20">
        <CardTitle>Basic Configuration</CardTitle>
        <CardDescription>Essential details for identifying this test in the catalog.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 p-8 md:grid-cols-2">
        <div className="md:col-span-2">
          <EditableField label="Test Title">
            <Input 
              className="h-12 text-lg font-bold"
              placeholder="e.g. Cambridge 19 - Academic Reading Test 1"
              value={draft.metadata.title} 
              onChange={(event) => setDraft((current) => ({ ...current, metadata: { ...current.metadata, title: event.target.value } }))} 
            />
          </EditableField>
        </div>

        <div className="space-y-6">
          <ReadOnlyField label="Test Category" value={draft.metadata.type.toUpperCase()} />
          
          <EditableField label="Test Format">
            <Select 
              className="h-11 font-medium"
              value={draft.metadata.format} 
              onChange={(event) => setDraft((current) => ({ ...current, metadata: { ...current.metadata, format: event.target.value as AdminTestDraftState["metadata"]["format"] } }))}>
              <option value="full">Full Mock Test (All parts)</option>
              {draft.metadata.type === "reading" ? (
                <>
                  <option value="passage_1">Practice Passage 1</option>
                  <option value="passage_2">Practice Passage 2</option>
                  <option value="passage_3">Practice Passage 3</option>
                </>
              ) : (
                <>
                  <option value="part_1">Practice Part 1</option>
                  <option value="part_2">Practice Part 2</option>
                  <option value="part_3">Practice Part 3</option>
                  <option value="part_4">Practice Part 4</option>
                </>
              )}
            </Select>
          </EditableField>
        </div>

        <div className="space-y-6">
          <EditableField label="Access Rule">
            <Select 
              className="h-11 font-medium"
              value={draft.metadata.accessType} 
              onChange={(event) => setDraft((current) => ({ ...current, metadata: { ...current.metadata, accessType: event.target.value as AdminTestDraftState["metadata"]["accessType"] } }))}>
              <option value="public">Free (Public Access)</option>
              <option value="premium">Premium (Subscribers Only)</option>
            </Select>
          </EditableField>

          <EditableField label="Primary Source">
             <Select 
              className="h-11 font-medium"
              value={draft.metadata.source} 
              onChange={(event) => setDraft((current) => ({ ...current, metadata: { ...current.metadata, source: event.target.value as any } }))}>
              <option value="cambridge">Cambridge Official</option>
              <option value="real_exam">Real Exam Material</option>
              <option value="custom">Custom Practice</option>
            </Select>
          </EditableField>
        </div>
      </CardContent>
    </Card>
  );
}


function ContentPanel({
  draft,
  setDraft
}: {
  draft: AdminTestDraftState;
  setDraft: React.Dispatch<React.SetStateAction<AdminTestDraftState>>;
}) {
  const addSection = () => {
    setDraft((current) => ({
      ...current,
      content: {
        sections: [
          ...current.content.sections,
          {
            id: `draft-section-${crypto.randomUUID()}`,
            label: current.metadata.type === "listening" ? `Part ${current.content.sections.length + 1}` : `Passage ${current.content.sections.length + 1}`,
            title: current.metadata.type === "listening" ? `Listening Part ${current.content.sections.length + 1}` : `Reading Passage ${current.content.sections.length + 1}`,
            subtitle: "",
            content: "",
            paragraphs: [],
            showLabels: false,
            mediaKind: current.metadata.type === "listening" ? "audio" : "text",
            markerCount: 0
          }
        ]
      }
    }));
  };

  const removeSection = (sectionId: string) => {
    setDraft((current) => ({
      ...current,
      content: { sections: current.content.sections.filter((s) => s.id !== sectionId) },
      questionGroups: (current.questionGroups ?? []).filter((g) => g.sectionId !== sectionId)
    }));
  };

  const updateSection = (sectionId: string, updates: Partial<AdminTestDraftContentSection>) => {
    setDraft((current) => ({
      ...current,
      content: {
        sections: current.content.sections.map((s) => s.id === sectionId ? { ...s, ...updates } : s)
      }
    }));
  };



  const resolveLogicalIndex = (uiIndex: number) => {
    if (draft.metadata.format === "full") return uiIndex;
    
    // Log for debugging
    console.log("[DEBUG] format:", draft.metadata.format);
    
    // Support new explicit formats (passage_1, passage_2, part_3)
    if (draft.metadata.format.includes("_")) {
      const formatSuffix = parseInt(draft.metadata.format.split("_")[1]);
      if (!isNaN(formatSuffix)) return formatSuffix - 1; // 1-based to 0-based index
    }
    
    // Fallback for legacy "part" format if present
    return uiIndex;
  };

  const getIeltsRangeStr = (uiIndex: number) => {
    const index = resolveLogicalIndex(uiIndex);
    if (draft.metadata.type === "listening") {
      const start = index * 10 + 1;
      const end = (index + 1) * 10;
      return `${start}-${end}`;
    }
    if (index === 0) return "1-13";
    if (index === 1) return "14-26";
    if (index === 2) return "27-40";
    return "X-Y";
  };

  const getIeltsIntroStr = (uiIndex: number) => {
    const index = resolveLogicalIndex(uiIndex);
    const range = getIeltsRangeStr(uiIndex);
    if (draft.metadata.type === "listening") {
      return `Part ${index + 1}. Questions ${range}.`;
    }
    return `You should spend about 20 minutes on Questions ${range}, which are based on Reading Passage ${index + 1} below.`;
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Test Content</h3>
            <p className="text-sm text-muted-foreground">Compose your reading passages or listening parts.</p>
          </div>
          {draft.metadata.format === "full" || draft.content.sections.length === 0 ? (
            <Button type="button" variant="solid" onClick={addSection}>
              + Add Section
            </Button>
          ) : null}
        </div>

        {draft.content.sections.map((section, idx) => (
          <Card key={section.id} className="border-border shadow-md overflow-hidden">
            <CardHeader className="bg-muted/30 border-b py-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-black uppercase">
                    {draft.metadata.type === "reading" ? `Passage ${resolveLogicalIndex(idx) + 1}` : `Part ${resolveLogicalIndex(idx) + 1}`}
                  </div>
                  <Input 
                    className="h-9 w-72 bg-background font-bold border-none focus-visible:ring-1" 
                    placeholder="Enter Passage Title (e.g. The Giant Squid)"
                    value={section.title} 
                    onChange={(e) => updateSection(section.id, { title: e.target.value })} 
                  />
                </div>
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => removeSection(section.id)}>
                  Remove
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="bg-primary/5 p-4 rounded-lg border border-primary/10 flex items-start gap-3">
                <div className="p-1.5 bg-primary/10 rounded text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-primary mb-1 tracking-widest">Instruction Preview</p>
                  <p className="text-sm text-foreground/80 font-medium italic leading-relaxed">
                    {getIeltsIntroStr(idx)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                   <h4 className="text-sm font-bold uppercase tracking-tighter text-muted-foreground flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M9 12h6"/><path d="M8 17h8"/><path d="M12 12v10"/><path d="M12 22l-3-3"/><path d="M12 22l3-3"/></svg>
                     Writing Zone
                   </h4>
                   <Button 
                     type="button" 
                     variant={section.showLabels ? "solid" : "outline"} 
                     size="sm" 
                     className="h-8 text-xs font-bold"
                     onClick={() => updateSection(section.id, { showLabels: !section.showLabels })}
                   >
                     {section.showLabels ? "Labels: ON (A, B, C)" : "Labels: OFF"}
                   </Button>
                 </div>
                 <div className="relative">
                   <Textarea 
                      className="min-h-[450px] text-base leading-relaxed font-serif p-6 shadow-inner border-2 focus-visible:border-primary transition-all resize-y" 
                      value={section.content} 
                      onChange={(e) => updateSection(section.id, { content: e.target.value, paragraphs: [] })} 
                      placeholder="Type or paste the passage text here. Use a blank line (double Enter) to separate paragraphs."
                   />
                   <div className="absolute bottom-4 right-4 pointer-events-none opacity-20">
                     <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                   </div>
                 </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold">User View Simulator</h3>
        <Card className="h-fit sticky top-6 border-border shadow-md overflow-hidden">
          <CardHeader className="bg-muted py-3 px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-red-400"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                 <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Preview</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-12 max-h-[75vh] overflow-y-auto pt-8 px-6 pb-16">
            {draft.content.sections.length === 0 ? (
               <div className="text-center py-20">
                 <p className="text-sm font-medium text-muted-foreground">Add a section to start simulating.</p>
               </div>
            ) : null}
            {draft.content.sections.map((section, idx) => {
              const paragraphs = section.content.split(/\n\s*\n/).filter(p => p.trim());
              return (
              <div key={section.id} className="space-y-6">
                <div className="space-y-2">
                  <p className="text-lg font-bold text-foreground">
                    {draft.metadata.type === "reading" ? `Reading Passage ${resolveLogicalIndex(idx) + 1}` : `Listening Part ${resolveLogicalIndex(idx) + 1}`}
                  </p>
                  <p className="text-sm font-medium italic text-foreground leading-relaxed border-l-2 border-primary/40 pl-3 py-0.5">
                    {getIeltsIntroStr(idx)}
                  </p>
                  {section.title && (
                    <p className="font-bold text-xl text-foreground pt-4 text-center">
                      {section.title}
                    </p>
                  )}
                </div>

                <div className="space-y-5">
                  {paragraphs.length > 0 ? (
                    paragraphs.map((p, pIdx) => (
                      <div key={pIdx} className="flex gap-4 items-start">
                        {section.showLabels && (
                          <div className="font-bold text-base text-primary shrink-0 w-8 h-8 flex items-center justify-center bg-muted rounded border">
                            {String.fromCharCode(65 + pIdx)}
                          </div>
                        )}
                        <p className="text-base leading-relaxed text-foreground font-serif whitespace-pre-wrap">
                          {p}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 bg-muted/20 rounded-lg border border-dashed">
                       <p className="text-sm text-muted-foreground italic">Waiting for content input...</p>
                    </div>
                  )}
                </div>
              </div>
            )})}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuestionsPanel({
  draft,
  setDraft
}: {
  draft: AdminTestDraftState;
  setDraft: React.Dispatch<React.SetStateAction<AdminTestDraftState>>;
}) {
  const addGroup = () => {
    const groups = draft.questionGroups ?? [];
    let nextStart = 1;
    if (groups.length > 0) {
      const maxEnd = Math.max(...groups.map(g => g.questionEnd));
      nextStart = maxEnd + 1;
    }
    const typeId = draft.metadata.type === "listening" ? "listening_form_completion" : "reading_true_false_not_given";
    const nextGroupNum = groups.length + 1;
    const newGroup: AdminTestDraftQuestionGroup = {
      id: `draft-group-${crypto.randomUUID()}`,
      sectionId: draft.content.sections[0]?.id ?? "",
      title: `Question Group ${nextGroupNum}`,
      instructions: defaultInstructions[typeId] || "Enter instructions for this group of questions.",
      typeId,
      questionStart: nextStart,
      questionEnd: nextStart,
      sharedOptions: [],
      questions: []
    };
    setDraft((current) => ({
      ...current,
      questionGroups: [...groups, newGroup]
    }));
  };

  const updateGroup = (groupId: string, updates: Partial<AdminTestDraftQuestionGroup>) => {
    setDraft((current) => ({
      ...current,
      questionGroups: (current.questionGroups ?? []).map((g) => {
        if (g.id !== groupId) return g;
        
        let newGroup = { ...g, ...updates };

        // Auto-update instructions if typeId changes
        if (updates.typeId && updates.typeId !== g.typeId) {
           newGroup.instructions = defaultInstructions[updates.typeId] || newGroup.instructions;
        }

        // Logic to Parse Blocks into Questions array
        if (updates.questionBlock !== undefined || updates.answerBlock !== undefined || updates.secondaryBlock !== undefined) {
           const qBlock = updates.questionBlock ?? g.questionBlock ?? "";
           const aBlock = updates.answerBlock ?? g.answerBlock ?? "";
           const sBlock = updates.secondaryBlock ?? g.secondaryBlock ?? "";

           const qLines = qBlock.split("\n\n").map(l => l.trim()).filter(Boolean);
           const aLines = aBlock.split("\n").map(l => l.trim()).filter(Boolean);
           const newQuestions: AdminTestDraftQuestion[] = [];
           
           // Shared Options extraction for Matching types
           const isMatchingHeadings = newGroup.typeId.includes("matching_headings") || newGroup.typeId.includes("matching_information");
           if (newGroup.typeId.includes("matching_headings") || newGroup.typeId.includes("matching_features") || newGroup.typeId.includes("matching_information") || newGroup.typeId.includes("wordbank")) {
             newGroup.sharedOptions = sBlock.split("\n").map(l => l.trim()).filter(Boolean);
           }

           // Smart Auto-generation for Matching Headings/Information based purely on answers
           if (isMatchingHeadings) {
             aLines.forEach((ansLine, index) => {
               newQuestions.push({
                 id: `draft-q-${crypto.randomUUID()}`,
                 label: `${newGroup.questionStart + index}`,
                 prompt: `Paragraph ${String.fromCharCode(65 + index)}`, // Paragraph A, B, C...
                 acceptedAnswers: ansLine.split("|").map(a => a.trim()),
                 explanation: "",
                 variants: []
               });
             });
           } else {
             // General Parsing for other types or if Question Block is explicitly provided
             qLines.forEach((qText, index) => {
               let prompt = qText;
               let variants: string[] = [];
               let acceptedAnswers: string[] = [];

               // Extract Answer(s) for this question from the corresponding line in aLines
               if (aLines[index]) {
                 acceptedAnswers = aLines[index].split("|").map(a => a.trim());
               }

               // Specific logic for Multiple Choice
               if (newGroup.typeId.includes("mc_")) {
                  const parts = qText.split(/\n([A-E]\.\s+)/);
                  if (parts.length > 1) {
                    prompt = parts[0].trim();
                    for (let i = 1; i < parts.length; i += 2) {
                      if (parts[i+1]) variants.push(parts[i+1].trim());
                    }
                  }
               }

               newQuestions.push({
                 id: `draft-q-${crypto.randomUUID()}`,
                 label: `${newGroup.questionStart + index}`,
                 prompt: prompt,
                 acceptedAnswers: acceptedAnswers,
                 explanation: "",
                 variants: variants
               });
             });
           }

           newGroup.questions = newQuestions;
           newGroup.questionEnd = newGroup.questionStart + Math.max(0, newQuestions.length - 1);
        }

        return newGroup;
      })
    }));
  };

  const removeGroup = (groupId: string) => {
    setDraft((current) => ({
      ...current,
      questionGroups: (current.questionGroups ?? []).filter((g) => g.id !== groupId)
    }));
  };

  const addQuestionToGroup = (groupId: string) => {
    setDraft((current) => ({
      ...current,
      questionGroups: (current.questionGroups ?? []).map((g) => {
        if (g.id !== groupId) return g;
        const nextQNum = g.questions.length;
        const label = `${g.questionStart + nextQNum}`;
        const newQuestions = [
          ...g.questions,
          {
            id: `draft-question-${crypto.randomUUID()}`,
            label,
            prompt: "",
            acceptedAnswers: [],
            explanation: "",
            variants: []
          }
        ];
        return {
          ...g,
          questions: newQuestions,
          questionEnd: g.questionStart + newQuestions.length - 1
        };
      })
    }));
  };

  const updateQuestion = (groupId: string, questionId: string, updates: Partial<AdminTestDraftQuestion>) => {
    setDraft((current) => ({
      ...current,
      questionGroups: (current.questionGroups ?? []).map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          questions: g.questions.map((q) => q.id === questionId ? { ...q, ...updates } : q)
        };
      })
    }));
  };

  const removeQuestion = (groupId: string, questionId: string) => {
    setDraft((current) => ({
      ...current,
      questionGroups: (current.questionGroups ?? []).map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          questions: g.questions.filter((q) => q.id !== questionId)
        };
      })
    }));
  };



  const resolveLogicalIndex = (uiIndex: number) => {
    if (draft.metadata.format === "full") return uiIndex;
    
    // Log for debugging
    console.log("[DEBUG] format:", draft.metadata.format);
    
    // Support new explicit formats (passage_1, passage_2, part_3)
    if (draft.metadata.format.includes("_")) {
      const formatSuffix = parseInt(draft.metadata.format.split("_")[1]);
      if (!isNaN(formatSuffix)) return formatSuffix - 1; // 1-based to 0-based index
    }
    
    // Fallback for legacy "part" format if present
    return uiIndex;
  };

  const getIeltsRangeStr = (uiIndex: number) => {
    const index = resolveLogicalIndex(uiIndex);
    if (draft.metadata.type === "listening") {
      const start = index * 10 + 1;
      const end = (index + 1) * 10;
      return `${start}-${end}`;
    }
    if (index === 0) return "1-13";
    if (index === 1) return "14-26";
    if (index === 2) return "27-40";
    return "X-Y";
  };

  const getIeltsIntroStr = (uiIndex: number) => {
    const index = resolveLogicalIndex(uiIndex);
    const range = getIeltsRangeStr(uiIndex);
    if (draft.metadata.type === "listening") {
      return `Part ${index + 1}. Questions ${range}.`;
    }
    return `You should spend about 20 minutes on Questions ${range}, which are based on Reading Passage ${index + 1} below.`;
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Questions Inventory</h3>
            <p className="text-sm text-muted-foreground">Manage question groups and their correct answers.</p>
          </div>
          <Button type="button" variant="solid" onClick={addGroup}>
            + Add Group
          </Button>
        </div>

        {(draft.questionGroups ?? []).map((group) => (
          <Card key={group.id} className="border-primary/20 bg-primary/5 shadow-md">
            <CardHeader className="pb-3 px-5 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <EditableField label="Group Label / Title">
                      <Input 
                        className="bg-background font-bold" 
                        value={group.title} 
                        onChange={(e) => updateGroup(group.id, { title: e.target.value })} 
                      />
                    </EditableField>
                    <EditableField label="Question Type">
                      <Select
                        className="bg-background"
                        value={group.typeId}
                        onChange={(e) => updateGroup(group.id, { typeId: e.target.value })}
                      >
                        {(draft.metadata.type === "listening" ? listeningQuestionTypes : readingQuestionTypes).map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </EditableField>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <EditableField label="Target Section">
                      <Select
                        className="bg-background"
                        value={group.sectionId}
                        onChange={(e) => updateGroup(group.id, { sectionId: e.target.value })}
                      >
                        {draft.content.sections.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </Select>
                    </EditableField>
                    <EditableField label="Start Q#">
                      <Input type="number" className="bg-background" value={group.questionStart} onChange={(e) => updateGroup(group.id, { questionStart: parseInt(e.target.value) || 1 })} />
                    </EditableField>
                    <EditableField label="End Q#">
                      <Input type="number" className="bg-background" value={group.questionEnd} onChange={(e) => updateGroup(group.id, { questionEnd: parseInt(e.target.value) || 1 })} />
                    </EditableField>
                  </div>
                  <EditableField label="Group Instructions">
                    <Textarea className="bg-background min-h-[60px]" value={group.instructions} onChange={(e) => updateGroup(group.id, { instructions: e.target.value })} />
                  </EditableField>

                  {(group.typeId.includes("matching_headings") || group.typeId.includes("matching_features") || group.typeId.includes("matching_information")) && (
                    <EditableField label="[SECONDARY BLOCK] (Headings or Options - one per line)">
                      <Textarea 
                        className="bg-muted/30 font-mono text-sm min-h-[100px]"
                        value={group.secondaryBlock || ""}
                        onChange={(e) => updateGroup(group.id, { secondaryBlock: e.target.value })}
                        placeholder="i. Heading One\nii. Heading Two\n..."
                      />
                    </EditableField>
                  )}
                  
                  <div className="grid gap-6 md:grid-cols-2 pt-4 border-t border-dashed border-primary/20">
                    {!(group.typeId.includes("matching_headings") || group.typeId.includes("matching_information")) && (
                      <EditableField label="[QUESTION BLOCK] (Separate items with double Enter)">
                        <Textarea 
                          className="bg-muted/30 font-mono text-sm min-h-[250px]"
                          value={group.questionBlock || ""}
                          onChange={(e) => updateGroup(group.id, { questionBlock: e.target.value })}
                          placeholder={group.typeId.includes("mc_") 
                            ? "Question Text?\nA. Option One\nB. Option Two\n..." 
                            : "Statement or sentence here..."}
                        />
                      </EditableField>
                    )}
                    <EditableField label="[ANSWER BLOCK] (One per line, use | for variants)">
                      <Textarea 
                        className="bg-muted/30 font-mono text-sm min-h-[250px]"
                        value={group.answerBlock || ""}
                        onChange={(e) => updateGroup(group.id, { answerBlock: e.target.value })}
                        placeholder="TRUE\nFALSE\nOR: answer1|variant2"
                      />
                    </EditableField>
                  </div>
                </div>
                <Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => removeGroup(group.id)}>
                  Delete
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              <div className="border-t border-primary/10 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary">Questions in this group</h4>
                  <Button type="button" variant="outline" size="sm" className="h-8 font-bold" onClick={() => addQuestionToGroup(group.id)}>
                    + Add Single Question
                  </Button>
                </div>

                <div className="space-y-4">
                  {group.questions.map((question, qIndex) => (
                    <div key={question.id} className="rounded-xl border border-border bg-background p-5 shadow-sm transition-all hover:shadow-lg relative">
                      <div className="flex items-center justify-between gap-3 mb-4 border-b pb-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted text-foreground px-3 py-1 rounded text-xs font-black">
                            Q{group.questionStart + qIndex}
                          </div>
                          <Input 
                            className="h-8 w-24 text-xs font-bold bg-muted/30" 
                            value={question.label} 
                            onChange={(e) => updateQuestion(group.id, question.id, { label: e.target.value })} 
                          />
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-8 text-destructive hover:bg-destructive/10" onClick={() => removeQuestion(group.id, question.id)}>
                          Remove
                        </Button>
                      </div>

                      <div className="grid gap-5">
                        <EditableField label="Question Stem / Prompt">
                          <Textarea 
                            className="min-h-[60px] text-base"
                            placeholder="Enter the question text or blank stem..."
                            value={question.prompt} 
                            onChange={(e) => updateQuestion(group.id, question.id, { prompt: e.target.value })} 
                          />
                        </EditableField>

                        {group.typeId.includes("mc_") && (
                          <EditableField label="Individual Options (A, B, C...)">
                            <Input 
                              className="font-medium"
                              value={(question.variants ?? []).join(", ")} 
                              onChange={(e) => updateQuestion(group.id, question.id, { variants: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                              placeholder="e.g. 1992, 1995, 1998, 2001"
                            />
                          </EditableField>
                        )}

                        <div className="grid gap-5 md:grid-cols-2">
                          <EditableField label="Correct Answer Selection">
                            {group.typeId.includes("true_false") || group.typeId.includes("yes_no") ? (
                              <Select 
                                className="font-bold border-primary/20"
                                value={question.acceptedAnswers[0] || ""} 
                                onChange={(e) => updateQuestion(group.id, question.id, { acceptedAnswers: [e.target.value] })}
                              >
                                <option value="">Select...</option>
                                {group.typeId.includes("true_false") ? (
                                  <>
                                    <option value="True">True</option>
                                    <option value="False">False</option>
                                    <option value="Not Given">Not Given</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                    <option value="Not Given">Not Given</option>
                                  </>
                                )}
                              </Select>
                            ) : group.typeId.includes("mc_") ? (
                              <Select 
                                className="font-bold border-primary/20"
                                value={question.acceptedAnswers[0] || ""} 
                                onChange={(e) => updateQuestion(group.id, question.id, { acceptedAnswers: [e.target.value] })}
                              >
                                <option value="">Select Correct Option...</option>
                                {(question.variants ?? []).map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </Select>
                            ) : (group.typeId.includes("matching") || group.typeId.includes("wordbank")) ? (
                              <Select 
                                className="font-bold border-primary/20"
                                value={question.acceptedAnswers[0] || ""} 
                                onChange={(e) => updateQuestion(group.id, question.id, { acceptedAnswers: [e.target.value] })}
                              >
                                <option value="">Select from Bank...</option>
                                {group.sharedOptions.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </Select>
                            ) : (
                              <Input 
                                className="font-bold border-primary/20"
                                placeholder="Type answer(s)..."
                                value={question.acceptedAnswers.join(", ")} 
                                onChange={(e) => updateQuestion(group.id, question.id, { acceptedAnswers: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} 
                              />
                            )}
                          </EditableField>

                          <EditableField label="Correct Answer Explanation">
                            <Textarea 
                              className="min-h-[40px] text-xs italic"
                              placeholder="Why is this answer correct?"
                              value={question.explanation} 
                              onChange={(e) => updateQuestion(group.id, question.id, { explanation: e.target.value })} 
                            />
                          </EditableField>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold">Preview / Reference</h3>
        <Card className="h-fit sticky top-6 border-border shadow-md overflow-hidden bg-background">
          <CardHeader className="bg-muted py-3 px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Test View</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-12 max-h-[75vh] overflow-y-auto pt-8 px-6 pb-16">
            {draft.content.sections.map((section, idx) => {
              const paragraphs = section.content.split(/\n\s*\n/).filter(p => p.trim());
              const relatedGroups = (draft.questionGroups ?? []).filter(g => g.sectionId === section.id);
              
              return (
              <div key={section.id} className="space-y-8">
                <div className="space-y-2">
                  <p className="font-bold text-lg text-foreground">
                    {draft.metadata.type === "reading" ? `Reading Passage ${resolveLogicalIndex(idx) + 1}` : `Listening Part ${resolveLogicalIndex(idx) + 1}`}
                  </p>
                  {section.title && (
                    <p className="font-bold text-xl text-foreground pt-2">
                      {section.title}
                    </p>
                  )}
                </div>

                <div className="space-y-5">
                  {paragraphs.map((p, pIdx) => (
                    <div key={pIdx} className="flex gap-4 items-start">
                      {section.showLabels && (
                        <div className="font-bold text-base text-primary shrink-0 w-8 h-8 flex items-center justify-center bg-muted rounded border">
                          {String.fromCharCode(65 + pIdx)}
                        </div>
                      )}
                      <p className="text-base leading-relaxed text-foreground font-serif whitespace-pre-wrap">
                        {p}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Questions Preview */}
                {relatedGroups.length > 0 && (
                  <div className="mt-12 space-y-10 border-t pt-8">
                    {relatedGroups.map(group => (
                      <div key={group.id} className="space-y-6">
                         <div>
                           <p className="font-bold text-xl text-foreground mb-3">Questions {group.questionStart}-{group.questionEnd}</p>
                           <p className="text-base italic text-foreground font-serif whitespace-pre-wrap leading-relaxed">{group.instructions}</p>
                         </div>
                         
                         {(group.typeId.includes("matching") || group.typeId.includes("wordbank")) && group.sharedOptions.length > 0 && (
                           <div className="border p-4 rounded-md mx-6 bg-card text-center flex flex-wrap justify-center gap-4">
                             {group.sharedOptions.map(opt => (
                               <span key={opt} className="font-semibold text-sm border px-2 py-1 bg-muted rounded">{opt}</span>
                             ))}
                           </div>
                         )}

                         <div className="space-y-5 pt-2">
                           {group.questions.map((q, qIdx) => (
                             <div key={q.id} className="flex gap-4 items-baseline">
                               <div className="font-bold shrink-0">{group.questionStart + qIdx}</div>
                               <div className="flex-1 space-y-3">
                                 {q.prompt && <p className="font-serif text-base leading-relaxed text-foreground">{q.prompt}</p>}
                                 
                                 {group.typeId.includes("mc_") && (q.variants?.length ?? 0) > 0 && (
                                   <div className="space-y-2 pl-4 pt-1">
                                     {q.variants.map((v, vIdx) => (
                                       <div key={vIdx} className="flex gap-2 font-serif text-base">
                                         <span className="font-bold w-6">{String.fromCharCode(65 + vIdx)}</span>
                                         <span>{v}</span>
                                       </div>
                                     ))}
                                   </div>
                                 )}
                               </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )})}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReviewPanel({ draft }: { draft: AdminTestDraftState }) {
  const validations = useMemo(() => {
    const checks: { label: string; status: "success" | "warning" | "error"; detail: string }[] = [];
    
    // Metadata checks
    if (!draft.metadata.title) checks.push({ label: "Title", status: "error", detail: "Test title is required." });
    
    // Content checks
    if (draft.content.sections.length === 0) {
      checks.push({ label: "Sections", status: "error", detail: "At least one passage/section is required." });
    } else {
      draft.content.sections.forEach((s, i) => {
        if (!s.content || s.content.length < 50) {
          checks.push({ label: `Section ${i+1} Content`, status: "warning", detail: "Content seems too short or empty." });
        }
      });
    }

    // Question Group checks
    const groups = draft.questionGroups ?? [];
    if (groups.length === 0) {
      checks.push({ label: "Questions", status: "error", detail: "No question groups created." });
    } else {
      let totalQ = 0;
      groups.forEach((g) => {
        totalQ += g.questions.length;
        if (g.questions.length === 0) {
          checks.push({ label: `Group: ${g.title}`, status: "error", detail: "This group has no questions." });
        }
        if (g.questionEnd < g.questionStart) {
          checks.push({ label: `Group: ${g.title}`, status: "error", detail: "Question range is invalid (End < Start)." });
        }
      });
      
      if (draft.metadata.type === "reading" && totalQ < 40) {
        checks.push({ label: "Question Count", status: "warning", detail: `Full reading usually has 40 questions (currently ${totalQ}).` });
      }
    }

    return checks;
  }, [draft]);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Automated Validation</CardTitle>
            <CardDescription>System checks for structure, numbering, and completeness.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {validations.map((v, i) => (
              <div key={i} className={cn(
                "rounded-md border px-4 py-3 flex items-center justify-between gap-3",
                v.status === "error" ? "border-danger/30 bg-danger/5" : v.status === "warning" ? "border-warning/30 bg-warning/5" : "border-success/30 bg-success/5"
              )}>
                <div>
                  <p className="font-medium text-sm">{v.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.detail}</p>
                </div>
                <Badge tone={v.status === "error" ? "danger" : v.status === "warning" ? "warning" : "success"}>
                  {v.status.toUpperCase()}
                </Badge>
              </div>
            ))}
            {validations.length === 0 && (
              <p className="text-sm text-center py-4 text-muted-foreground">No issues found. Ready to publish!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
            <CardDescription>Review state is derived from the draft.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {draft.review.checklist.map((item) => (
              <div key={item.id} className="rounded-md border border-border bg-card/45 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Publisher notes</CardTitle>
          <CardDescription>Critical reminders before publish.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
          <div className="bg-muted p-4 rounded-lg border border-border space-y-2">
            <p className="font-semibold text-foreground">Summary Statistics</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <p>Type: <span className="text-foreground uppercase">{draft.metadata.type}</span></p>
              <p>Access: <span className="text-foreground uppercase">{draft.metadata.accessType}</span></p>
              <p>Sections: <span className="text-foreground">{draft.content.sections.length}</span></p>
              <p>Groups: <span className="text-foreground">{draft.questionGroups?.length ?? 0}</span></p>
              <p>Total Questions: <span className="text-foreground">{(draft.questionGroups ?? []).reduce((acc, g) => acc + g.questions.length, 0)}</span></p>
            </div>
          </div>
          <div className="space-y-3">
            {draft.review.notes.map((note) => (
              <p key={note}>• {note}</p>
            ))}
            <p>• <code>{"{{N}}"}</code> markers stay canonical for every completion renderer.</p>
            <p>• Explanations remain premium-only at runtime, even for public tests.</p>
            <p>• Published edits create a new version and preserve attempt snapshots.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-card/45 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium text-foreground">{value}</p>
    </div>
  );
}


function EditableField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card/45 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}


function stepLabel(step: WizardStepId): string {
  if (step === "metadata") return "Metadata";
  if (step === "content") return "Content";
  if (step === "questions") return "Questions";
  return "Review";
}


function stepDescription(step: WizardStepId, draft: AdminTestDraftState): string {
  if (step === "metadata") return `${draft.metadata.type} · ${draft.metadata.timeLimitLabel}`;
  if (step === "content") return `${draft.content.sections.length} content sections`;
  if (step === "questions") return `${draft.questions.length} draft questions`;
  return `${draft.review.checklist.length} review checks`;
}


function statusTone(status: AdminDraftChecklistStatus): "success" | "warning" | "danger" | "neutral" {
  if (status === "ready") return "success";
  if (status === "blocked") return "danger";
  return "warning";
}
