"use client";

import { WritingResultReadyView, WritingSubmissionResult, fetchWritingSubmissionResult, pollWritingSubmission, retryWritingSubmission, useEffect, useMemo, useRef, useState } from "./dependencies";

import { GRADING_STEPS, LoadingStage, ResultClientProps, STEP_ADVANCE_MS } from "./shared-part-01";

import { buildAnnotatedSegments } from "./shared-part-02";

import { FailedScreen, GradingScreen } from "./shared-part-04";



export function useWritingResultClientState({
  submissionId,
  initialStatus,
  initialErrorMessage,
  initialResult,
}: ResultClientProps) {
  const initialStage = useMemo<LoadingStage>(() => {
      const status = String(initialStatus ?? "").toLowerCase();
      if (initialResult) return "ready";
      if (status === "failed") return "failed";
      return "polling";
    }, [initialStatus, initialResult]);
  
  const [stage, setStage] = useState<LoadingStage>(initialStage);
  
  const [result, setResult] = useState<WritingSubmissionResult | null>(initialResult);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage);
  
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null);
  
  const [activeVersion, setActiveVersion] = useState<"original" | "improved">("improved");
  
  const [activeStep, setActiveStep] = useState(0);
  
  const [sseAvailable, setSseAvailable] = useState(true);
  
  const [retrying, setRetrying] = useState(false);
  
  const [desiredScore, setDesiredScore] = useState(7.5);
  
  const [copiedAnnotation, setCopiedAnnotation] = useState<number | null>(null);
  
  const annotatedRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
      try {
        const saved = window.localStorage.getItem("prime-desired-score");
        const parsed = saved ? parseFloat(saved) : 7.5;
        if (Number.isFinite(parsed)) {
          setDesiredScore(Math.min(9, Math.max(4, parsed)));
        }
      } catch {}
    }, []);
  
  useEffect(() => {
      if (stage === "ready" || stage === "failed") return;
      if (activeStep >= GRADING_STEPS.length - 1) return;
  
      const timer = setTimeout(() => {
        setActiveStep((prev) => Math.min(GRADING_STEPS.length - 1, prev + 1));
      }, STEP_ADVANCE_MS);
  
      return () => {
        clearTimeout(timer);
      };
    }, [activeStep, stage]);
  
  useEffect(() => {
      if (stage === "ready" || stage === "failed" || !sseAvailable) return;
      if (typeof window === "undefined" || typeof EventSource === "undefined") {
        setSseAvailable(false);
        return;
      }
  
      const events = new EventSource(`/internal-api/writing/submissions/${submissionId}/events`);
  
      events.onmessage = async (event) => {
        const payload = JSON.parse(event.data) as {
          status?: string;
          stepIndex?: number;
          errorMessage?: string | null;
        };
        const status = String(payload.status ?? "").toLowerCase();
        if (typeof payload.stepIndex === "number") {
          const nextStep = Math.max(0, Math.min(payload.stepIndex, GRADING_STEPS.length - 1));
          setActiveStep((prev) => Math.max(prev, nextStep));
        }
  
        if (status === "completed") {
          setStage("loading_result");
          setActiveStep(GRADING_STEPS.length - 1);
          try {
            const resultPayload = await fetchWritingSubmissionResult(submissionId);
            setResult(resultPayload);
            setStage("ready");
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Failed to load writing result.");
            setStage("failed");
          } finally {
            events.close();
          }
          return;
        }
  
        if (status === "failed") {
          setErrorMessage(payload.errorMessage ?? "Writing evaluation failed.");
          setStage("failed");
          events.close();
          return;
        }
  
        setStage(status === "queued" ? "polling" : "loading_result");
      };
  
      events.onerror = () => {
        events.close();
        setSseAvailable(false);
        setStage((current) => (current === "ready" || current === "failed" ? current : "polling"));
      };
  
      return () => {
        events.close();
      };
    }, [stage, submissionId, sseAvailable]);
  
  useEffect(() => {
      if (sseAvailable || stage === "ready" || stage === "failed") return;
  
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
  
      const poll = async () => {
        try {
          const data = await pollWritingSubmission(submissionId);
          const status = String(data.status ?? "").toLowerCase();
          if (cancelled) return;
          if (status === "completed") {
            setStage("loading_result");
            setActiveStep(GRADING_STEPS.length - 1);
            const payload = await fetchWritingSubmissionResult(submissionId);
            if (!cancelled) {
              setResult(payload);
              setStage("ready");
            }
            return;
          }
          if (status === "failed") {
            if (!cancelled) {
              setErrorMessage(data.error_message ?? null);
              setStage("failed");
            }
            return;
          }
          timer = setTimeout(poll, 3000);
        } catch (err) {
          if (cancelled) return;
          timer = setTimeout(poll, 4500);
        }
      };
  
      poll();
  
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }, [sseAvailable, stage, submissionId]);
  
  const annotations = useMemo(
      () => result?.inline_annotations ?? [],
      [result?.inline_annotations],
    );
  
  const segments = useMemo(
      () => (result ? buildAnnotatedSegments(result.essay_text, annotations) : []),
      [result, annotations],
    );
  
  useEffect(() => {
      if (activeAnnotation === null) return;
      const root = annotatedRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(
        `mark[data-anno-idx="${activeAnnotation}"]`,
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, [activeAnnotation]);
  
  const handleRetry = async () => {
      if (retrying) return;
      setRetrying(true);
      setErrorMessage(null);
      try {
        await retryWritingSubmission(submissionId);
        setResult(null);
        setActiveStep(0);
        setSseAvailable(true);
        setStage("polling");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Retry failed.");
        setStage("failed");
      } finally {
        setRetrying(false);
      }
    };
  
  const copyText = async (value: string, annotationIndex: number | null) => {
      if (!value.trim()) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopiedAnnotation(annotationIndex);
        window.setTimeout(() => setCopiedAnnotation(null), 1500);
      } catch {}
    };

  return { submissionId, initialStatus, initialErrorMessage, initialResult, initialStage, stage, setStage, result, setResult, errorMessage, setErrorMessage, activeAnnotation, setActiveAnnotation, activeVersion, setActiveVersion, activeStep, setActiveStep, sseAvailable, setSseAvailable, retrying, setRetrying, desiredScore, setDesiredScore, copiedAnnotation, setCopiedAnnotation, annotatedRef, annotations, segments, handleRetry, copyText };
}

export type WritingResultClientState = ReturnType<typeof useWritingResultClientState>;

export function WritingResultClient(props: ResultClientProps) {
  const scope = useWritingResultClientState(props);
  const { stage, errorMessage, handleRetry, retrying, activeStep, result } = scope;

  if (stage === "failed") {
      return (
        <div className="mx-auto max-w-3xl py-8">
          <FailedScreen message={errorMessage} onRetry={handleRetry} retrying={retrying} />
        </div>
      );
    }

  if (stage !== "ready" || !result) {
      return (
        <div className="mx-auto max-w-3xl py-8">
          <GradingScreen stage={stage} activeStep={activeStep} />
        </div>
      );
    }

  return <WritingResultReadyView scope={{ ...scope, result }} />;
}
