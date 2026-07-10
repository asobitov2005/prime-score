"use client";
import type { BaseScope } from "./base";
import { AdminTestDraftState, WizardStepId, adminApi, createEmptyDraft, useEffect, useMemo, useRef, useRouter, useState } from "../dependencies";
import { hasMeaningfulDraftContent, normalizeBinaryDraftAnswers, prepareDraftForSave, stepOrder } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { mode, testId, initialDraft } = scope;
  const router = useRouter();

  const [activeStep, setActiveStep] = useState<WizardStepId>("metadata");

  const draftSeed = useMemo(
      () => normalizeBinaryDraftAnswers(initialDraft ?? createEmptyDraft()),
      [initialDraft],
    );

  const draftSeedStr = useMemo(() => JSON.stringify(draftSeed), [draftSeed]);

  const [draft, setDraft] = useState<AdminTestDraftState>(draftSeed);

  const [resolvedTestId, setResolvedTestId] = useState<string | undefined>(testId);

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const [publishState, setPublishState] = useState<"idle" | "publishing" | "published" | "error">("idle");

  const activeStepIndex = stepOrder.indexOf(activeStep);

  const completionRatio = ((activeStepIndex + 1) / stepOrder.length) * 100;

  const [editSourceStatus, setEditSourceStatus] = useState<AdminTestDraftState["metadata"]["status"]>(draftSeed.metadata.status);

  const isPublishedEdit = mode === "edit" && editSourceStatus === "published";

  // Auto-Save Effect (Debounced)
    const [lastSavedDraftStr, setLastSavedDraftStr] = useState<string>("");

  const draftRef = useRef(draft);

  const lastHydratedDraftSeedRef = useRef(draftSeedStr);

  useEffect(() => {
      draftRef.current = draft;
    }, [draft]);

  useEffect(() => {
      if (isPublishedEdit || saveState === "saving" || publishState === "publishing" || publishState === "published") return;
  
      const currentDraftStr = JSON.stringify(draft);
      if (currentDraftStr === lastSavedDraftStr) return;
  
      const handler = setTimeout(() => {
        if (hasMeaningfulDraftContent(draft)) {
          void saveDraft(true, currentDraftStr);
        }
      }, 2000);
  
      return () => {
        clearTimeout(handler);
      };
    }, [draft, isPublishedEdit, lastSavedDraftStr, saveState, publishState]);

  useEffect(() => {
      const currentDraftStr = JSON.stringify(draftRef.current);
      const previousHydratedSeedStr = lastHydratedDraftSeedRef.current;
      const canHydrateSafely =
        currentDraftStr === previousHydratedSeedStr
        || currentDraftStr === draftSeedStr;
  
      if (!canHydrateSafely) {
        return;
      }
  
      lastHydratedDraftSeedRef.current = draftSeedStr;
      setDraft(draftSeed);
      setLastSavedDraftStr(draftSeedStr);
      setEditSourceStatus(draftSeed.metadata.status);
    }, [draftSeed, draftSeedStr]);

  useEffect(() => {
      if (mode !== "edit" || !resolvedTestId) {
        return;
      }
  
      let cancelled = false;
      const seedAtRequest = draftSeedStr;
  
      void adminApi.getDraft(resolvedTestId)
        .then((latestDraft) => {
          if (cancelled) {
            return;
          }
  
          const normalizedLatestDraft = normalizeBinaryDraftAnswers(latestDraft);
          const latestDraftStr = JSON.stringify(normalizedLatestDraft);
          if (latestDraftStr === seedAtRequest) {
            return;
          }
  
          if (JSON.stringify(draftRef.current) !== seedAtRequest) {
            return;
          }
  
          setDraft(normalizedLatestDraft);
          setLastSavedDraftStr(latestDraftStr);
        })
        .catch(() => undefined);
  
      return () => {
        cancelled = true;
      };
    }, [draftSeedStr, mode, resolvedTestId]);

  async function saveDraft(isAutoSave = false, draftStr?: string) {
      try {
        setSaveState("saving");
        setSaveErrorMessage(null);
        const currentDraftToSave = prepareDraftForSave(draft);
        
        const saved = resolvedTestId
          ? await adminApi.updateDraft(resolvedTestId, currentDraftToSave, {
              allowNewVersion: isPublishedEdit && !isAutoSave,
            })
          : await adminApi.createDraft(currentDraftToSave);
  
        const syncedDraft = {
          ...currentDraftToSave,
          metadata: {
            ...currentDraftToSave.metadata,
            title: saved.title,
            status: saved.status,
            version: saved.version,
            format: saved.format
          }
        };
  
        setResolvedTestId(saved.id);
        setEditSourceStatus(saved.status);
        setDraft((current) => ({
          ...current,
          metadata: {
            ...current.metadata,
            title: saved.title,
            status: saved.status,
            version: saved.version,
            format: saved.format,
          }
        }));
        
        // Update our tracking string to match what we just saved, 
        // preventing the effect from immediately firing again
        setLastSavedDraftStr(JSON.stringify(syncedDraft));
        
        setSaveState("saved");
        if (saved.id !== resolvedTestId) {
          if (!isAutoSave) {
            router.replace(`/tests/${saved.id}/edit`);
          } else {
            window.history.replaceState(null, "", `/tests/${saved.id}/edit`);
          }
        } else if (!testId && !isAutoSave) {
          router.replace(`/tests/${saved.id}/edit`);
        } else if (!testId && isAutoSave) {
          window.history.replaceState(null, "", `/tests/${saved.id}/edit`);
        }
  
        if (!isAutoSave) {
          router.refresh();
        }
        
        setTimeout(() => {
          setSaveState(current => current === "saved" ? "idle" : current);
        }, 3000);
      } catch (error) {
        setSaveErrorMessage(error instanceof Error ? error.message : "Save failed.");
        setSaveState("error");
      }
    }

  async function quickFixPublished() {
      if (!resolvedTestId) {
        return;
      }
  
      try {
        setSaveState("saving");
        const currentDraftToSave = prepareDraftForSave(draft);
        const saved = await adminApi.quickFixPublished(resolvedTestId, currentDraftToSave);
        const syncedDraft = {
          ...currentDraftToSave,
          metadata: {
            ...currentDraftToSave.metadata,
            title: saved.title,
            status: saved.status,
            version: saved.version,
            format: saved.format,
          },
        };
  
        setDraft((current) => ({
          ...current,
          metadata: {
            ...current.metadata,
            title: saved.title,
            status: saved.status,
            version: saved.version,
            format: saved.format,
          },
        }));
        setLastSavedDraftStr(JSON.stringify(syncedDraft));
        setSaveState("saved");
        setTimeout(() => {
          setSaveState((current) => (current === "saved" ? "idle" : current));
        }, 3000);
      } catch {
        setSaveState("error");
      }
    }

  return { router, activeStep, setActiveStep, draftSeed, draftSeedStr, draft, setDraft, resolvedTestId, setResolvedTestId, saveState, setSaveState, saveErrorMessage, setSaveErrorMessage, publishState, setPublishState, activeStepIndex, completionRatio, editSourceStatus, setEditSourceStatus, isPublishedEdit, lastSavedDraftStr, setLastSavedDraftStr, draftRef, lastHydratedDraftSeedRef, saveDraft, quickFixPublished };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
