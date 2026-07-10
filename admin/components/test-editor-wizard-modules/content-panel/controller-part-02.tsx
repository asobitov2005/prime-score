"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { adminApi, useEffect } from "../dependencies";
import { FULL_TEST_AUDIO_UPLOAD_ID, createDraftContentSection, getAudioFileDurationSeconds } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { draft, setDraft, collapsedSections, setCollapsedSections, setUploadingSectionId, setContentErrorMessage, collapseStateReady, setCollapseStateReady, collapseStorageKey } = scope;
  const handleFullTestAudioUpload = async (file?: File | null) => {
      if (!file || draft.metadata.type !== "listening") return;
      setUploadingSectionId(FULL_TEST_AUDIO_UPLOAD_ID);
      try {
        const [asset, duration] = await Promise.all([
          adminApi.uploadAudio(file),
          getAudioFileDurationSeconds(file),
        ]);
        setContentErrorMessage(null);
        setDraft((current) => {
          const baseSections = current.content.sections.length > 0
            ? current.content.sections
            : [createDraftContentSection(current.metadata.type, 0)];
  
          return {
            ...current,
            content: {
              sections: baseSections.map((section, index) => ({
                ...section,
                mediaKind: "audio",
                audioUrl: asset.publicUrl,
                audioDurationSeconds: index === 0 ? duration : null,
                transcript: "",
                transcriptSegments: [],
                transcriptQuestionLocations: [],
              })),
            },
          };
        });
      } catch (error) {
        setContentErrorMessage(error instanceof Error ? error.message : "Audio upload failed.");
      } finally {
        setUploadingSectionId((current) => (current === FULL_TEST_AUDIO_UPLOAD_ID ? null : current));
      }
    };

  const clearFullTestAudio = () => {
      setDraft((current) => ({
        ...current,
        content: {
          sections: current.content.sections.map((section) => ({
            ...section,
            audioUrl: "",
            audioDurationSeconds: 0,
            transcript: "",
            transcriptSegments: [],
            transcriptQuestionLocations: [],
          })),
        },
      }));
    };

  useEffect(() => {
      let storedCollapsedSections: Record<string, boolean> = {};
      if (typeof window !== "undefined") {
        try {
          storedCollapsedSections = JSON.parse(window.localStorage.getItem(collapseStorageKey) ?? "{}") as Record<string, boolean>;
        } catch {
          storedCollapsedSections = {};
        }
      }
  
      setCollapsedSections((current) => {
        const next: Record<string, boolean> = {};
        for (const section of draft.content.sections) {
          next[section.id] = current[section.id] ?? storedCollapsedSections[section.id] ?? false;
        }
        return next;
      });
      setCollapseStateReady(true);
    }, [collapseStorageKey, draft.content.sections]);

  useEffect(() => {
      if (!collapseStateReady || typeof window === "undefined") return;
      const snapshot: Record<string, boolean> = {};
      for (const section of draft.content.sections) {
        snapshot[section.id] = collapsedSections[section.id] ?? false;
      }
      window.localStorage.setItem(collapseStorageKey, JSON.stringify(snapshot));
    }, [collapseStateReady, collapseStorageKey, collapsedSections, draft.content.sections]);

  const resolveLogicalIndex = (uiIndex: number) => {
      if (draft.metadata.format === "full") return uiIndex;
  
      console.log("[DEBUG] format:", draft.metadata.format);
  
      if (draft.metadata.format.includes("_")) {
        const formatSuffix = parseInt(draft.metadata.format.split("_")[1]);
        if (!isNaN(formatSuffix)) return formatSuffix - 1;
      }
  
      return uiIndex;
    };

  const getIeltsRangeStr = (uiIndex: number) => {
      const index = resolveLogicalIndex(uiIndex);
      if (draft.metadata.type === "listening") {
        const start = index * 10 + 1;
        const end = (index + 1) * 10;
        return start + "-" + end;
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
        return "Part " + (index + 1) + ". Questions " + range + ".";
      }
      return "You should spend about 20 minutes on Questions " + range + ", which are based on Reading Passage " + (index + 1) + " below.";
    };

  return { handleFullTestAudioUpload, clearFullTestAudio, resolveLogicalIndex, getIeltsRangeStr, getIeltsIntroStr };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
