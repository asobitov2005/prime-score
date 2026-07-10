"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { deleteWritingDraftClient, getWritingDraftClient, saveWritingDraftClient, useCallback, useEffect, useMemo } from "../dependencies";
import { MIN_DRAFT_WORDS, WritingDraftRecord, countWords } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { task, resolvedTaskType, wordMinimum, timeLimitSeconds, storageKey, isStarted, setIsStarted, topic, setTopic, essay, setEssay, imageFile, setImageFile, setImagePreviewUrl, draftImageDataUrl, setDraftImageDataUrl, secondsRemaining, setSecondsRemaining, elapsed, setElapsed, setSubmitError, setSyncState, setIsFullscreen, hasAcknowledgedTimeUp, setHasAcknowledgedTimeUp, lastSavedRef, latestDraftRef, draftPersistedRef, updateTheme } = scope;
  useEffect(() => {
      let cancelled = false;
  
      async function hydrateDraft() {
        setSecondsRemaining(timeLimitSeconds);
        setElapsed(0);
        setIsStarted(true);
        setImageFile(null);
        setDraftImageDataUrl(null);
        setSubmitError(null);
        setSyncState("idle");
        setHasAcknowledgedTimeUp(false);
  
        let localDraft: WritingDraftRecord | null = null;
        try {
          const raw = window.localStorage.getItem(storageKey);
          if (raw) {
            localDraft = JSON.parse(raw) as WritingDraftRecord;
            if (!task) {
              setTopic(localDraft.topic ?? "");
            }
            setEssay(localDraft.essay ?? "");
            setDraftImageDataUrl(localDraft.imageDataUrl ?? null);
          } else {
            setTopic("");
            setEssay("");
          }
        } catch {
          setTopic("");
          setEssay("");
        }
  
        try {
          const remoteDraft = await getWritingDraftClient(storageKey);
          if (cancelled) return;
          if (!task) {
            setTopic(remoteDraft.topic || localDraft?.topic || "");
          }
          setEssay(remoteDraft.essay_text || localDraft?.essay || "");
          setDraftImageDataUrl(remoteDraft.image_data_url ?? localDraft?.imageDataUrl ?? null);
          setElapsed(remoteDraft.time_spent_seconds ?? 0);
          setSecondsRemaining(Math.max(0, timeLimitSeconds - (remoteDraft.time_spent_seconds ?? 0)));
          setIsStarted(true);
          draftPersistedRef.current = true;
          setSyncState("saved");
        } catch {
          if (cancelled) return;
          if (localDraft) {
            setTopic(task ? "" : localDraft.topic ?? "");
            setEssay(localDraft.essay ?? "");
            setDraftImageDataUrl(localDraft.imageDataUrl ?? null);
            setSecondsRemaining(Math.max(0, timeLimitSeconds - (localDraft.timeSpentSeconds ?? 0)));
            setElapsed(localDraft.timeSpentSeconds ?? 0);
            setIsStarted(true);
            setSyncState("saved");
          } else {
            draftPersistedRef.current = false;
            setSyncState("idle");
          }
        }
      }
  
      void hydrateDraft();
      return () => {
        cancelled = true;
      };
    }, [storageKey, task, timeLimitSeconds]);

  useEffect(() => {
      const savedTheme = (() => {
        try {
          return window.localStorage.getItem("prime-theme") as "light" | "dark" | null;
        } catch {
          return null;
        }
      })();
      const nextTheme = savedTheme ?? "light";
      updateTheme(nextTheme);
  
      const syncFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
      syncFullscreenState();
      document.addEventListener("fullscreenchange", syncFullscreenState);
      return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
    }, [updateTheme]);

  useEffect(() => {
      if (!imageFile) return;
      const nextUrl = URL.createObjectURL(imageFile);
      setImagePreviewUrl(nextUrl);
      const reader = new FileReader();
      reader.onload = () => {
        setDraftImageDataUrl(typeof reader.result === "string" ? reader.result : null);
      };
      reader.readAsDataURL(imageFile);
  
      return () => URL.revokeObjectURL(nextUrl);
    }, [imageFile]);

  useEffect(() => {
      if (!imageFile) {
        setImagePreviewUrl(draftImageDataUrl);
      }
    }, [draftImageDataUrl, imageFile]);

  useEffect(() => {
      if (!isStarted || timeLimitSeconds <= 0) return;
  
      const id = window.setInterval(() => {
        setSecondsRemaining((current) => Math.max(0, current - 1));
        setElapsed((current) => current + 1);
      }, 1000);
      return () => window.clearInterval(id);
    }, [isStarted, timeLimitSeconds]);

  useEffect(() => {
      latestDraftRef.current = {
        task_id: task?.id ?? null,
        task_type: resolvedTaskType,
        topic: task ? "" : topic,
        essay_text: essay,
        image_data_url: draftImageDataUrl,
        started: isStarted,
        time_spent_seconds: elapsed,
      };
    }, [draftImageDataUrl, elapsed, essay, isStarted, resolvedTaskType, task, topic]);

  useEffect(() => {
      const id = window.setInterval(() => {
        const now = Date.now();
        if (now - lastSavedRef.current > 4500) {
          const payload = latestDraftRef.current;
          if (!payload) return;
          const draftWords = countWords(payload.essay_text);
          try {
            if (draftWords < MIN_DRAFT_WORDS) {
              window.localStorage.removeItem(storageKey);
              if (draftPersistedRef.current) {
                void deleteWritingDraftClient(storageKey).finally(() => {
                  draftPersistedRef.current = false;
                });
              }
              setSyncState("idle");
              lastSavedRef.current = now;
              return;
            }
  
            setSyncState("saving");
            window.localStorage.setItem(
              storageKey,
              JSON.stringify({
                topic: payload.topic,
                essay: payload.essay_text,
                imageDataUrl: payload.image_data_url,
                started: payload.started,
                timeSpentSeconds: payload.time_spent_seconds,
                updatedAt: new Date(now).toISOString(),
              } satisfies WritingDraftRecord),
            );
            void saveWritingDraftClient(storageKey, payload)
              .then(() => {
                draftPersistedRef.current = true;
                setSyncState("saved");
              })
              .catch(() => {
                setSyncState("error");
              });
            lastSavedRef.current = now;
          } catch {
            setSyncState("error");
          }
        }
      }, 5000);
      return () => window.clearInterval(id);
    }, [storageKey]);

  const wordCount = useMemo(() => countWords(essay), [essay]);

  const minDraftWords = Math.ceil(wordMinimum * 0.5);

  const hasPrompt = task ? true : topic.trim().length > 0;

  const canSubmit = isStarted && hasPrompt && wordCount >= minDraftWords;

  const hasReachedTimeLimit = isStarted && timeLimitSeconds > 0 && elapsed >= timeLimitSeconds;

  const showTimeUpDialog = hasReachedTimeLimit && !hasAcknowledgedTimeUp;

  const timerIsOvertime = hasReachedTimeLimit && hasAcknowledgedTimeUp;

  const timerDisplaySeconds = timerIsOvertime ? elapsed : secondsRemaining;

  const handleTopicChange = useCallback((value: string) => {
      setTopic(value);
      setSyncState("saving");
    }, []);

  const handleEssayChange = useCallback((value: string) => {
      setEssay(value);
      setSyncState("saving");
    }, []);

  const handleImageChange = useCallback((file: File | null) => {
      setImageFile(file);
      if (!file) {
        setDraftImageDataUrl(null);
      }
      setSyncState("saving");
    }, []);

  return { wordCount, minDraftWords, hasPrompt, canSubmit, hasReachedTimeLimit, showTimeUpDialog, timerIsOvertime, timerDisplaySeconds, handleTopicChange, handleEssayChange, handleImageChange };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
