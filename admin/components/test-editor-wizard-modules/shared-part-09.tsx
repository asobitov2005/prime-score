"use client";

import { AdminTestDraftState, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Select, adminApi, adminTestSourceOptions, cn } from "./dependencies";

import { isListeningMapFreeTextType, isListeningMapOptionType } from "./shared-part-03";

import { isExamPracticeAutoTitle } from "./shared-part-06";

import { getNextExamPracticeTitleFromTests } from "./shared-part-07";

import { EditableField, ReadOnlyField } from "./shared-part-11";



export function MetadataPanel({
  draft,
  setDraft
}: {
  draft: AdminTestDraftState;
  setDraft: React.Dispatch<React.SetStateAction<AdminTestDraftState>>;
}) {
  async function handleSourceChange(nextSource: AdminTestDraftState["metadata"]["source"]) {
    const shouldAutoApplyTitle =
      nextSource === "custom"
      && (
        draft.metadata.title.trim().length === 0
        || isExamPracticeAutoTitle(draft.metadata.title)
        || draft.metadata.source !== "custom"
      );

    if (!shouldAutoApplyTitle) {
      setDraft((current) => ({ ...current, metadata: { ...current.metadata, source: nextSource } }));
      return;
    }

    try {
      const tests = await adminApi.listTests();
      const nextTitle = getNextExamPracticeTitleFromTests(tests, draft.metadata.type);
      setDraft((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          source: nextSource,
          title: nextTitle,
        },
      }));
    } catch {
      setDraft((current) => ({
        ...current,
        metadata: {
          ...current.metadata,
          source: nextSource,
          title: nextSource === "custom" ? "Exam Practice Test" : current.metadata.title,
        },
      }));
    }
  }

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
              onChange={(event) => { void handleSourceChange(event.target.value as AdminTestDraftState["metadata"]["source"]); }}>
              {adminTestSourceOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </EditableField>
        </div>
      </CardContent>
    </Card>
  );
}

export function EditorUserPreview({
  draft,
  previewId,
  resolveLogicalIndex,
  getIeltsIntroStr,
  compact = false,
  showSectionIntro = true,
}: {
  draft: AdminTestDraftState;
  previewId: string;
  resolveLogicalIndex: (uiIndex: number) => number;
  getIeltsIntroStr: (uiIndex: number) => string;
  compact?: boolean;
  showSectionIntro?: boolean;
}) {
  if (draft.content.sections.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-sm font-medium text-muted-foreground">Add a section to start simulating.</p>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full", compact ? "max-w-[760px] space-y-5" : "max-w-[900px] space-y-7")}>
      {draft.content.sections.map((section, idx) => {
        const relatedGroups = (draft.questionGroups ?? []).filter((group) => group.sectionId === section.id);

        return (
          <EditorPreviewSection
            key={`${previewId}-${section.id}`}
            previewId={previewId}
            draftType={draft.metadata.type}
            section={section}
            logicalIndex={resolveLogicalIndex(idx)}
            intro={getIeltsIntroStr(idx)}
            groups={relatedGroups}
            compact={compact}
            showSectionIntro={showSectionIntro}
          />
        );
      })}
    </div>
  );
}

export function previewTypeLabel(typeId: string) {
  if (typeId.includes("true_false")) return "True / False / Not Given";
  if (typeId.includes("yes_no")) return "Yes / No / Not Given";
  if (typeId.includes("mc_")) return "Multiple Choice";
  if (typeId.includes("matching")) return "Matching";
  if (typeId.includes("summary") || typeId.includes("sentence_completion") || typeId.includes("note_completion") || typeId.includes("table_completion") || typeId.includes("flowchart_completion") || typeId.includes("form_completion")) return "Completion";
  if (isListeningMapOptionType(typeId)) return "Map Labeling";
  if (isListeningMapFreeTextType(typeId)) return "Map Labeling (free text)";
  if (typeId.includes("diagram")) return "Diagram Labeling";
  if (typeId.includes("short_answer")) return "Short Answer";
  return "Question Group";
}
