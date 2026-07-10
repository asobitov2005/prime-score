"use client";
import type { AiSettingsDashboardScope } from "./controller";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Notice, SectionHeader, Select, Textarea, WritingTaskTypeScope } from "../dependencies";
import { PROMPT_KEYS, PROMPT_LABELS, createProviderDraft, toneForSync } from "../shared";
import { AiSettingsDashboardSection2 } from "./view-section-02";
import { AiSettingsDashboardSection3 } from "./view-section-03";

export function AiSettingsDashboardView1({ scope }: { scope: AiSettingsDashboardScope }) {
  const { notice, providers, providerDrafts, modelsByProvider, setProviderDraft, handleSaveProvider, busyKey, handleValidateProvider, handleSyncProvider, writingUseCases, renderUseCaseBinding, otherUseCases, newProfileDraft, setNewProfileDraft, handleCreateProfile, profiles, setSelectedProfileId, selectedProfile, setProfiles, selectedProfileEntries, updateSelectedPromptEntry, handleSaveProfile, handlePublishProfile, previewDraft, setPreviewDraft, handlePreview, preview, rubrics, anchorSets, auditEntries } = scope;
  return (
    (
        <div className="space-y-8">
          <SectionHeader eyebrow="Writing AI" title="Writing Prompts + AI Settings" description="Edit every writing prompt used by grading, annotation, rewrite, and roast flows. The old chat workspace is disabled." />
    
          {notice ? <Notice tone={notice.tone} title={notice.title} description={notice.description} /> : null}
    
          <AiSettingsDashboardSection2 scope={scope} />
    
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <CardTitle>Writing Model Bindings</CardTitle>
                  <CardDescription>Choose the exact AI model used by each writing runtime step.</CardDescription>
                </div>
                <Badge tone="info">{writingUseCases.length} active roles</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {writingUseCases.map(renderUseCaseBinding)}
              {writingUseCases.length === 0 ? (
                <Notice tone="warning" title="Writing bindings are missing" description="Sync or seed AI settings so writing grader, improver, roast, and image-summary bindings can be configured." />
              ) : null}
            </CardContent>
          </Card>
    
          {otherUseCases.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Runtime Model Bindings</CardTitle>
                <CardDescription>Speaking, transcription, and other non-writing runtime roles. Admin chat is hidden because the workspace chat was removed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {otherUseCases.map(renderUseCaseBinding)}
              </CardContent>
            </Card>
          ) : null}
    
          <AiSettingsDashboardSection3 scope={scope} />
        </div>
      )
  );
}
