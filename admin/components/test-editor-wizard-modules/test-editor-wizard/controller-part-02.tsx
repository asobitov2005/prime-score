"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { adminApi } from "../dependencies";
import { prepareDraftForSave } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { router, draft, setDraft, resolvedTestId, setResolvedTestId, setSaveState, setSaveErrorMessage, setPublishState } = scope;
  async function publishDraft() {
      let targetTestId = resolvedTestId;
      if (!targetTestId) {
        try {
          setSaveState("saving");
          setSaveErrorMessage(null);
          const preparedDraft = prepareDraftForSave(draft);
          const saved = await adminApi.createDraft(preparedDraft);
          targetTestId = saved.id;
          setResolvedTestId(saved.id);
          setDraft((current) => ({
            ...current,
            metadata: {
              ...current.metadata,
              title: saved.title,
              version: saved.version,
              status: saved.status
            }
          }));
          setSaveState("saved");
          router.replace(`/tests/${saved.id}/edit`);
        } catch (error) {
          setSaveErrorMessage(error instanceof Error ? error.message : "Save failed.");
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

  return { publishDraft };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
