"use client";
import type { BaseScope } from "./base";
import { AdminTestDraftContentSection, adminApi, useMemo, usePathname, useState } from "../dependencies";
import { TranscriptProgressState, buildTranscriptTextFromSegments, createDraftContentSection, detectSharedListeningAudioSections, getAudioFileDurationSeconds, resolveChoiceAnswerText } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { draft, setDraft } = scope;
  const pathname = usePathname();

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const [deleteConfirmSectionId, setDeleteConfirmSectionId] = useState<string | null>(null);

  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);

  const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null);

  const [transcribingSectionId, setTranscribingSectionId] = useState<string | null>(null);

  const [transcriptProgressBySection, setTranscriptProgressBySection] = useState<Record<string, TranscriptProgressState>>({});

  const [contentErrorMessage, setContentErrorMessage] = useState<string | null>(null);

  const [collapseStateReady, setCollapseStateReady] = useState(false);

  const collapseStorageKey = useMemo(() => "admin-content-sections:" + pathname, [pathname]);

  const sharedListeningAudio = useMemo(
      () => draft.metadata.type === "listening" && draft.metadata.format === "full"
        ? detectSharedListeningAudioSections(draft.content.sections)
        : null,
      [draft.content.sections, draft.metadata.format, draft.metadata.type]
    );

  const isUsingFullTestAudio = Boolean(sharedListeningAudio);

  const addSection = () => {
      setDraft((current) => ({
        ...current,
        content: {
          sections: [
            ...current.content.sections,
            createDraftContentSection(
              current.metadata.type,
              current.content.sections.length,
              current.metadata.type === "listening" && current.metadata.format === "full"
                ? detectSharedListeningAudioSections(current.content.sections)
                : null
            )
          ]
        }
      }));
    };

  const removeSection = (sectionId: string) => {
      setDraft((current) => {
        const sharedAudioBeforeRemoval = current.metadata.type === "listening" && current.metadata.format === "full"
          ? detectSharedListeningAudioSections(current.content.sections)
          : null;
        const nextSections = current.content.sections.filter((section) => section.id !== sectionId);
  
        if (sharedAudioBeforeRemoval && nextSections.length > 0 && !nextSections.some((section) => (section.audioDurationSeconds ?? 0) > 0)) {
          nextSections[0] = {
            ...nextSections[0],
            audioDurationSeconds: sharedAudioBeforeRemoval.audioDurationSeconds,
          };
        }
  
        return {
          ...current,
          content: { sections: nextSections },
          questionGroups: (current.questionGroups ?? []).filter((g) => g.sectionId !== sectionId)
        };
      });
      setDeleteConfirmSectionId(null);
      setCollapsedSections((current) => {
        const next = { ...current };
        delete next[sectionId];
        return next;
      });
    };

  const updateSection = (sectionId: string, updates: Partial<AdminTestDraftContentSection>) => {
      setDraft((current) => ({
        ...current,
        content: {
          sections: current.content.sections.map((s) => s.id === sectionId ? { ...s, ...updates } : s)
        }
      }));
    };

  const getSectionTranscriptQuestionPayload = (sectionId: string) =>
      (draft.questionGroups ?? [])
        .filter((group) => group.sectionId === sectionId)
        .flatMap((group) =>
          group.questions.flatMap((question) => {
            const labelMatch = question.label.match(/(\d+)\s*-\s*(\d+)/);
            if (labelMatch) {
              const start = Number(labelMatch[1]);
              const end = Number(labelMatch[2]);
              const labels = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => String(start + index));
              if (labels.length > 1 && question.acceptedAnswers.length >= labels.length) {
                return labels.map((label, index) => ({
                  questionId: `${question.id}:${label}`,
                  questionLabel: label,
                  questionPrompt: question.prompt,
                  acceptedAnswers: [
                    resolveChoiceAnswerText(group, question, question.acceptedAnswers[index] ?? "")
                  ].filter(Boolean),
                }));
              }
            }
  
            return [{
              questionId: question.id,
              questionLabel: question.label,
              questionPrompt: question.prompt,
              acceptedAnswers: question.acceptedAnswers
                .map((answer) => resolveChoiceAnswerText(group, question, answer))
                .filter(Boolean),
            }];
          })
        );

  const regenerateTranscript = async (section: AdminTestDraftContentSection, audioMeta?: { filename?: string; contentType?: string }) => {
      if (!section.audioUrl) return;
      setTranscribingSectionId(section.id);
      setTranscriptProgressBySection((current) => ({
        ...current,
        [section.id]: {
          value: 4,
          label: "Starting transcript job...",
          startedAt: Date.now(),
        },
      }));
      try {
        const transcriptPayload = await adminApi.generateListeningTranscript({
          audioUrl: section.audioUrl,
          audioFilename: audioMeta?.filename,
          audioContentType: audioMeta?.contentType,
          sectionLabel: section.label,
          sectionTitle: section.title,
          transcript: section.transcript,
          transcriptSegments: section.transcriptSegments,
          onJobId: (jobId) => {
            setTranscriptProgressBySection((current) => ({
              ...current,
              [section.id]: {
                value: current[section.id]?.value ?? 6,
                label: current[section.id]?.label ?? "Starting transcript job...",
                startedAt: current[section.id]?.startedAt ?? Date.now(),
                jobId,
              },
            }));
          },
          onProgress: ({ value, label }) => {
            setTranscriptProgressBySection((current) => ({
              ...current,
              [section.id]: {
                value,
                label,
                startedAt: current[section.id]?.startedAt ?? Date.now(),
                jobId: current[section.id]?.jobId,
              },
            }));
          },
          questions: getSectionTranscriptQuestionPayload(section.id),
        });
        const transcriptText = transcriptPayload.transcript.trim() || buildTranscriptTextFromSegments(transcriptPayload.transcriptSegments);
        updateSection(section.id, {
          mediaKind: "audio",
          transcript: transcriptText,
          transcriptSegments: transcriptPayload.transcriptSegments,
          transcriptQuestionLocations: transcriptPayload.transcriptQuestionLocations,
        });
      } finally {
        setTranscribingSectionId((current) => (current === section.id ? null : current));
        setTranscriptProgressBySection((current) => {
          const next = { ...current };
          delete next[section.id];
          return next;
        });
      }
    };

  const cancelTranscriptGeneration = async (sectionId: string) => {
      const jobId = transcriptProgressBySection[sectionId]?.jobId;
      if (!jobId) return;
      try {
        await adminApi.cancelListeningTranscriptJob(jobId);
      } finally {
        setTranscribingSectionId((current) => (current === sectionId ? null : current));
        setTranscriptProgressBySection((current) => {
          const next = { ...current };
          delete next[sectionId];
          return next;
        });
      }
    };

  const handleAudioUpload = async (sectionId: string, file?: File | null) => {
      if (!file) return;
      setUploadingSectionId(sectionId);
      try {
        const [asset, duration] = await Promise.all([
          adminApi.uploadAudio(file),
          getAudioFileDurationSeconds(file),
        ]);
        setContentErrorMessage(null);
        updateSection(sectionId, {
          audioUrl: asset.publicUrl,
          audioDurationSeconds: duration,
          mediaKind: "audio",
          transcript: "",
          transcriptSegments: [],
          transcriptQuestionLocations: [],
        });
      } catch (error) {
        setContentErrorMessage(error instanceof Error ? error.message : "Audio upload failed.");
      } finally {
        setUploadingSectionId((current) => (current === sectionId ? null : current));
        setDraggingSectionId((current) => (current === sectionId ? null : current));
      }
    };

  return { pathname, collapsedSections, setCollapsedSections, deleteConfirmSectionId, setDeleteConfirmSectionId, draggingSectionId, setDraggingSectionId, uploadingSectionId, setUploadingSectionId, transcribingSectionId, setTranscribingSectionId, transcriptProgressBySection, setTranscriptProgressBySection, contentErrorMessage, setContentErrorMessage, collapseStateReady, setCollapseStateReady, collapseStorageKey, sharedListeningAudio, isUsingFullTestAudio, addSection, removeSection, updateSection, getSectionTranscriptQuestionPayload, regenerateTranscript, cancelTranscriptGeneration, handleAudioUpload };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
