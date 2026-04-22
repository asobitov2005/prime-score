"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eraser, Expand, Highlighter, Minus, Moon, MoveHorizontal, Plus, SendHorizontal, Shrink, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

type PreviewMode = "practice" | "exam";
type PreviewQuestionType = "tfng" | "mcq" | "gap";
type PreviewDialog = "submit" | "leave" | null;
type TextHighlight = { id: string; start: number; end: number };
type SelectionToolbarState = {
  blockKey: string;
  start: number;
  end: number;
  top: number;
  left: number;
} | null;

interface PreviewQuestion {
  id: string;
  number: number;
  type: PreviewQuestionType;
  prompt: string;
  options?: string[];
  instruction?: string;
}

interface PreviewGroup {
  id: string;
  title: string;
  instruction: string;
  type: PreviewQuestionType;
  questions: PreviewQuestion[];
}

const PASSAGE_PARAGRAPHS = [
  {
    label: "A",
    text:
      "In many large cities, flat rooftops were once ignored spaces used only for ventilation units and storage. Over the last decade, however, architects and local councils have started to treat those surfaces as a practical environmental resource. Research teams working in Seoul, Rotterdam, and Toronto found that well-designed rooftop gardens can lower the temperature of the top floor, reduce storm-water pressure during heavy rain, and create small but measurable habitats for insects and birds.",
  },
  {
    label: "B",
    text:
      "Early projects focused mainly on appearance, yet the strongest results came from buildings that treated rooftops as working systems. A shallow layer of engineered soil, a drainage mat, and carefully selected native plants proved more effective than decorative flowerbeds that required constant replacement. In one Canadian study, energy use for summer cooling fell by roughly twelve percent in offices where the roof system had been installed and maintained for at least two years.",
  },
  {
    label: "C",
    text:
      "Not every claim about rooftop planting has been confirmed. Some property owners assume that any green roof will immediately improve air quality across a district, but most published studies describe the effect as local and limited. Researchers also warn that poorly planned installations can fail if they use unsuitable soil depth or if maintenance teams do not check irrigation during unusually dry months. For this reason, several city guidelines now require an inspection plan before a project is approved.",
  },
  {
    label: "D",
    text:
      "Despite those cautions, rooftop ecology is now part of mainstream urban planning. Developers increasingly include it because the long-term savings can offset the initial installation cost, especially on large commercial buildings. City officials are also interested in its educational value: schools with accessible roof plots often use them for science lessons, allowing students to measure temperature differences, monitor pollinators, and study how engineered landscapes behave through the year.",
  },
];

const QUESTION_GROUPS: PreviewGroup[] = [
  {
    id: "group-tfng",
    title: "Questions 1-5",
    instruction: "Do the following statements agree with the information in the passage? Choose TRUE, FALSE, or NOT GIVEN.",
    type: "tfng",
    questions: [
      { id: "q1", number: 1, type: "tfng", prompt: "Rooftops in large cities were traditionally valued as useful environmental spaces." },
      { id: "q2", number: 2, type: "tfng", prompt: "Researchers found that rooftop gardens can reduce pressure on drainage systems during storms." },
      { id: "q3", number: 3, type: "tfng", prompt: "Decorative flowerbeds performed better than native plant systems in long-term trials." },
      { id: "q4", number: 4, type: "tfng", prompt: "Every study reviewed by researchers reported major improvements in city-wide air quality." },
      { id: "q5", number: 5, type: "tfng", prompt: "Some schools use rooftop plots as part of classroom learning." },
    ],
  },
  {
    id: "group-mcq",
    title: "Questions 6-9",
    instruction: "Choose the correct letter, A, B, C, or D.",
    type: "mcq",
    questions: [
      {
        id: "q6",
        number: 6,
        type: "mcq",
        prompt: "What was the main weakness of many early rooftop projects?",
        options: [
          "They were designed mainly to look attractive.",
          "They used too many native plants.",
          "They were built only on schools.",
          "They relied on excessive irrigation technology.",
        ],
      },
      {
        id: "q7",
        number: 7,
        type: "mcq",
        prompt: "According to the Canadian study, what happened after roof systems were established?",
        options: [
          "Winter heating demand rose sharply.",
          "Cooling energy use dropped by around twelve percent.",
          "Bird populations disappeared from the area.",
          "Office workers moved to top floors more often.",
        ],
      },
      {
        id: "q8",
        number: 8,
        type: "mcq",
        prompt: "Why do some city guidelines require an inspection plan?",
        options: [
          "To ensure roofs are open to the public every weekend.",
          "To reduce the number of native species being planted.",
          "To prevent failures caused by poor planning or maintenance.",
          "To compare rooftop projects with underground gardens.",
        ],
      },
      {
        id: "q9",
        number: 9,
        type: "mcq",
        prompt: "Why are developers increasingly willing to include rooftop ecology?",
        options: [
          "It guarantees immediate improvements in district-wide air quality.",
          "It usually costs less than installing drainage systems.",
          "Long-term savings can balance the initial cost.",
          "It removes the need for building inspections.",
        ],
      },
    ],
  },
  {
    id: "group-gap",
    title: "Questions 10-13",
    instruction: "Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.",
    type: "gap",
    questions: [
      { id: "q10", number: 10, type: "gap", prompt: "Researchers measured rooftop gardens as small habitats for insects and ________." },
      { id: "q11", number: 11, type: "gap", prompt: "A layer of engineered soil and a ________ mat formed part of the effective roof system." },
      { id: "q12", number: 12, type: "gap", prompt: "Researchers describe air-quality improvements as ________ and limited." },
      { id: "q13", number: 13, type: "gap", prompt: "Students can study how engineered landscapes behave through the ________." },
    ],
  },
];

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatMinutesLeft(totalSeconds: number) {
  const minutesLeft = Math.max(1, Math.ceil(totalSeconds / 60));
  return `${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left`;
}

function typeLabel(type: PreviewQuestionType) {
  if (type === "tfng") return "True / False / Not Given";
  if (type === "mcq") return "Multiple Choice";
  return "Gap Filling";
}

export function ReadingExamPreview({ mode }: { mode: PreviewMode }) {
  const router = useRouter();
  const candidateName = useAuthStore((state) => state.name) || "Guest Candidate";
  const containerRef = useRef<HTMLElement | null>(null);
  const textBlockRefs = useRef<Record<string, HTMLElement | null>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [splitRatio, setSplitRatio] = useState(54);
  const [fontScale, setFontScale] = useState(1);
  const [timeLeft, setTimeLeft] = useState(mode === "exam" ? 20 * 60 : 0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<PreviewDialog>(null);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [textHighlights, setTextHighlights] = useState<Record<string, TextHighlight[]>>({});
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbarState>(null);
  const allowLeaveRef = useRef(false);

  useEffect(() => {
    const nextTheme = document.documentElement.classList.contains("light") ? "light" : "dark";
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (isSubmitted) return;
    if (mode === "exam") {
      const timer = window.setInterval(() => {
        setTimeLeft((current) => (current <= 1 ? 0 : current - 1));
      }, 1000);
      return () => window.clearInterval(timer);
    }

    const timer = window.setInterval(() => {
      setTimeLeft((current) => current + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isSubmitted, mode]);

  useEffect(() => {
    if (timeLeft === 0 && mode === "exam" && !isSubmitted) {
      setIsSubmitted(true);
    }
  }, [timeLeft, mode, isSubmitted]);

  const answeredCount = useMemo(
    () => Object.values(answers).filter((value) => value.trim().length > 0).length,
    [answers]
  );
  const totalQuestions = useMemo(
    () => QUESTION_GROUPS.reduce((count, group) => count + group.questions.length, 0),
    []
  );
  const unansweredCount = totalQuestions - answeredCount;
  const isExamMode = mode === "exam";
  const isLastFiveMinutes = isExamMode && timeLeft <= 5 * 60;
  const isLastMinute = isExamMode && timeLeft <= 60;
  const effectiveFontScale = fontScale * 0.93;
  const bodyFontSize = 17 * effectiveFontScale;
  const timerDisplay = isExamMode
    ? isLastFiveMinutes
      ? formatCountdown(timeLeft)
      : formatMinutesLeft(timeLeft)
    : formatCountdown(timeLeft);
  const layoutStyle = {
    "--reading-pane": `${splitRatio}%`,
    "--question-pane": `${100 - splitRatio}%`,
  } as CSSProperties;
  const examToneStyle = (theme === "dark"
    ? {
        "--foreground": "210 16% 86%",
        "--card-foreground": "210 16% 86%",
        "--popover-foreground": "210 16% 86%",
        "--muted-foreground": "215 13% 68%",
      }
    : {}) as CSSProperties;

  function updateTheme(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    localStorage.setItem("prime-theme", nextTheme);
    document.documentElement.classList.add(nextTheme);
    document.documentElement.classList.remove(nextTheme === "light" ? "dark" : "light");
  }

  function handleSubmit() {
    if (isSubmitted) return;
    setActiveDialog("submit");
  }

  function confirmSubmit() {
    setActiveDialog(null);
    setIsSubmitted(true);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        return;
      }
      await document.exitFullscreen();
    } catch {}
  }

  const headerControlClass = cn(
    "border-border bg-card text-foreground transition-colors hover:bg-muted"
  );

  useEffect(() => {
    if (!isDraggingSplit) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const nextRatio = ((event.clientX - rect.left) / rect.width) * 100;
      const clampedRatio = Math.min(58, Math.max(42, nextRatio));
      setSplitRatio(Number(clampedRatio.toFixed(1)));
    };

    const stopDragging = () => setIsDraggingSplit(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDraggingSplit]);

  useEffect(() => {
    if (isSubmitted) {
      allowLeaveRef.current = true;
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      if (allowLeaveRef.current) return;
      window.history.pushState({ examPreviewGuard: true }, "", window.location.href);
      setActiveDialog("leave");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const isRefreshShortcut =
        event.key === "F5" || ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r");

      if (!isRefreshShortcut) return;
      event.preventDefault();
      setActiveDialog("leave");
    };

    window.history.pushState({ examPreviewGuard: true }, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitted]);

  function confirmLeave() {
    allowLeaveRef.current = true;
    setActiveDialog(null);
    router.push("/tests?type=reading");
  }

  function startSplitDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDraggingSplit(true);
  }

  function clearSelection() {
    window.getSelection()?.removeAllRanges();
    setSelectionToolbar(null);
  }

  function hasActiveSelection() {
    const selection = window.getSelection();
    return Boolean(selection && !selection.isCollapsed && selection.toString().trim().length > 0);
  }

  function getTextOffsets(blockNode: HTMLElement, range: Range) {
    const fullRange = document.createRange();
    fullRange.selectNodeContents(blockNode);

    const startRange = fullRange.cloneRange();
    startRange.setEnd(range.startContainer, range.startOffset);
    const start = startRange.toString().length;

    const endRange = fullRange.cloneRange();
    endRange.setEnd(range.endContainer, range.endOffset);
    const end = endRange.toString().length;

    return { start, end };
  }

  function handleTextBlockMouseUp(blockKey: string) {
    window.setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed || selection.toString().trim().length === 0) {
        setSelectionToolbar(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const blockNode = textBlockRefs.current[blockKey];
      if (!blockNode || !blockNode.contains(range.commonAncestorContainer)) {
        setSelectionToolbar(null);
        return;
      }

      const { start, end } = getTextOffsets(blockNode, range);
      if (start === end) {
        setSelectionToolbar(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      setSelectionToolbar({
        blockKey,
        start,
        end,
        top: rect.bottom + 10,
        left: rect.left + rect.width / 2,
      });
    }, 0);
  }

  function normalizeHighlights(highlights: TextHighlight[]) {
    const sorted = [...highlights].sort((a, b) => a.start - b.start);
    const merged: TextHighlight[] = [];

    for (const highlight of sorted) {
      const last = merged[merged.length - 1];
      if (!last || highlight.start > last.end) {
        merged.push(highlight);
        continue;
      }
      last.end = Math.max(last.end, highlight.end);
    }

    return merged;
  }

  function applyHighlight() {
    if (!selectionToolbar) return;

    setTextHighlights((current) => {
      const existing = current[selectionToolbar.blockKey] ?? [];
      const next = normalizeHighlights([
        ...existing,
        {
          id: `${selectionToolbar.blockKey}-${selectionToolbar.start}-${selectionToolbar.end}-${Date.now()}`,
          start: selectionToolbar.start,
          end: selectionToolbar.end,
        },
      ]);

      return {
        ...current,
        [selectionToolbar.blockKey]: next,
      };
    });

    clearSelection();
  }

  function clearHighlight() {
    if (!selectionToolbar) return;

    setTextHighlights((current) => {
      const existing = current[selectionToolbar.blockKey] ?? [];
      const next = existing.filter(
        (highlight) =>
          highlight.end <= selectionToolbar.start || highlight.start >= selectionToolbar.end
      );

      return {
        ...current,
        [selectionToolbar.blockKey]: next,
      };
    });

    clearSelection();
  }

  function renderHighlightedText(blockKey: string, text: string) {
    const highlights = (textHighlights[blockKey] ?? []).slice().sort((a, b) => a.start - b.start);
    if (highlights.length === 0) {
      return text;
    }

    const parts: ReactNode[] = [];
    let cursor = 0;

    highlights.forEach((highlight, index) => {
      if (cursor < highlight.start) {
        parts.push(<span key={`text-${index}-${cursor}`}>{text.slice(cursor, highlight.start)}</span>);
      }

      parts.push(
        <mark
          key={highlight.id}
          className="rounded-[0.25rem] bg-amber-300/65 px-[1px] text-inherit dark:bg-amber-200/18 dark:ring-1 dark:ring-amber-200/28"
        >
          {text.slice(highlight.start, highlight.end)}
        </mark>
      );

      cursor = highlight.end;
    });

    if (cursor < text.length) {
      parts.push(<span key={`tail-${cursor}`}>{text.slice(cursor)}</span>);
    }

    return parts;
  }

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-selection-toolbar]")) {
        return;
      }
      if (target?.closest("[data-highlight-text]")) {
        return;
      }
      setSelectionToolbar(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground" style={examToneStyle}>
      {selectionToolbar ? (
        <div
          data-selection-toolbar
          className="fixed z-[80] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card/95 px-2 py-1.5 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.7)] backdrop-blur-xl"
          style={{ top: selectionToolbar.top, left: selectionToolbar.left }}
        >
          <button
            type="button"
            onClick={applyHighlight}
            title="Highlight selected text"
            aria-label="Highlight selected text"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-300/85 text-slate-900 transition hover:bg-amber-300 dark:bg-amber-200/22 dark:text-amber-100 dark:hover:bg-amber-200/28"
          >
            <Highlighter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={clearHighlight}
            title="Remove highlight"
            aria-label="Remove highlight"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted"
          >
            <Eraser className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {activeDialog ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] border border-border/80 bg-card p-6 shadow-[0_40px_120px_-30px_rgba(15,23,42,0.55)]">
            <div className="mb-5 space-y-2">
              <Badge className={cn(
                "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] shadow-none",
                activeDialog === "submit"
                  ? unansweredCount > 0
                    ? "bg-red-500/10 text-red-400"
                    : "bg-primary/10 text-primary"
                  : "bg-primary/10 text-primary"
              )}>
                {activeDialog === "submit" ? (unansweredCount > 0 ? "Submission Warning" : "Ready To Submit") : "Leave Protection"}
              </Badge>
              <h3 className="text-xl font-black tracking-tight text-foreground">
                {activeDialog === "submit"
                  ? unansweredCount > 0
                    ? "You have unanswered questions"
                    : "Submit this reading test?"
                  : "Leave this reading test?"}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {activeDialog === "submit"
                  ? unansweredCount > 0
                    ? `You left ${unansweredCount} question${unansweredCount === 1 ? "" : "s"} unanswered. Do you want to submit your test anyway?`
                    : "All questions are answered. Submit now when you are ready to lock this mock attempt."
                  : "You are about to leave the split-screen exam preview. If you continue, your current answers in this mock session will be lost."}
              </p>
            </div>

            {activeDialog === "submit" && unansweredCount > 0 ? (
              <div className="mb-5 rounded-2xl border border-red-500/45 bg-red-500/8 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-400">Questions Left</p>
                <p className="mt-1 text-lg font-black text-red-300">
                  {unansweredCount} unanswered
                </p>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              {activeDialog === "submit" ? (
                <>
                  <Button
                    type="button"
                    className="rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground hover:bg-primary/90"
                    onClick={() => setActiveDialog(null)}
                  >
                    Go back & finish
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-border bg-background px-4 text-sm font-bold text-foreground hover:bg-muted"
                    onClick={confirmSubmit}
                  >
                    Submit anyway
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-border bg-background px-4 text-sm font-bold text-foreground hover:bg-muted"
                    onClick={() => setActiveDialog(null)}
                  >
                    Stay In Test
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl bg-red-500 px-4 text-sm font-black text-white hover:bg-red-400"
                    onClick={confirmLeave}
                  >
                    Leave Test
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 text-foreground shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="mx-auto grid min-h-[68px] max-w-[1800px] grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 items-center">
              <img
                src={theme === "light" ? "/exam-logo-lightmode.svg" : "/exam-logo-darkmode.svg"}
                alt="PrimeScore"
                className="h-8 w-auto"
              />
            </div>
            <div className="min-w-0 border-l border-border pl-3">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-muted-foreground">Test Taker</p>
              <p className="truncate text-sm font-semibold text-foreground">{candidateName}</p>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div
              className={cn(
                "px-2 text-center transition-all",
                isLastMinute && "animate-[pulse_2.4s_ease-in-out_infinite]"
              )}
            >
              <p
                className={cn(
                  "text-[15px] font-bold leading-none",
                  isLastFiveMinutes
                    ? "font-mono tracking-[0.18em] text-red-400 dark:text-red-300"
                    : "tracking-[0.04em] text-foreground"
                )}
              >
                {timerDisplay}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className={cn("h-9 w-9 rounded-xl p-0", headerControlClass)}
              onClick={() => updateTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
              className={cn("h-9 w-9 rounded-xl p-0", headerControlClass)}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Shrink className="h-[18px] w-[18px]" /> : <Expand className="h-[18px] w-[18px]" />}
            </Button>
            <div className={cn("flex items-center rounded-xl p-0.5 shadow-inner", headerControlClass)}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-foreground hover:bg-muted"
                onClick={() => setFontScale((current) => Math.max(0.9, Number((current - 0.05).toFixed(2))))}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="px-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{Math.round(fontScale * 100)}%</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-foreground hover:bg-muted"
                onClick={() => setFontScale((current) => Math.min(1.2, Number((current + 0.05).toFixed(2))))}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitted}
              className={cn(
                "h-8 rounded-xl px-3 text-[11px] font-black uppercase tracking-[0.16em]",
                theme === "dark"
                  ? "bg-primary text-slate-950 hover:bg-primary/90"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isSubmitted ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <SendHorizontal className="mr-1.5 h-3.5 w-3.5" />}
              {isSubmitted ? "Submitted" : "Submit"}
            </Button>
          </div>
        </div>
      </header>

      <main
        ref={containerRef}
        style={layoutStyle}
        className="relative mx-auto flex max-w-[1800px] flex-col lg:h-[calc(100vh-68px)] lg:flex-row"
      >
        <section className="border-b border-border/70 bg-card/40 lg:w-[var(--reading-pane)] lg:flex-none lg:border-b-0 lg:border-r lg:border-border/80">
          <div
            className="h-full overflow-y-auto px-5 py-6 [scrollbar-width:none] lg:px-8 lg:py-8 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarGutter: "stable" }}
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-foreground">Urban Rooftops and Hidden Ecology</h1>
                <p className="max-w-3xl text-sm font-medium text-muted-foreground">
                  Read the passage and answer questions 1-13. Keep your answers in the question panel on the right.
                </p>
              </div>
              <div className="grid gap-1 text-right">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {answeredCount} of 13 answered
                </span>
              </div>
            </div>

            <article className="space-y-5">
              {PASSAGE_PARAGRAPHS.map((paragraph, paragraphIndex) => (
                <div key={paragraph.label} className="px-1 py-1">
                  <p
                    ref={(node) => {
                      textBlockRefs.current[`passage-${paragraphIndex}`] = node;
                    }}
                    data-highlight-text
                    onMouseUp={() => handleTextBlockMouseUp(`passage-${paragraphIndex}`)}
                    className="font-sans text-foreground"
                    style={{
                      fontSize: `${bodyFontSize}px`,
                      lineHeight: 1.5,
                      textAlign: "justify",
                      textJustify: "inter-word",
                    }}
                  >
                    {renderHighlightedText(`passage-${paragraphIndex}`, paragraph.text)}
                  </p>
                </div>
              ))}
            </article>
          </div>
        </section>

        <section className="bg-muted/15 lg:w-[var(--question-pane)] lg:flex-none">
          <div
            className="h-full overflow-y-auto px-4 py-5 [scrollbar-width:none] lg:px-6 lg:py-6 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarGutter: "stable" }}
          >
            <div className="sticky top-0 z-20 mb-5 space-y-3 bg-background/95 pb-3 backdrop-blur-xl">
              <div className="rounded-[1.4rem] border border-border/80 bg-card px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-muted-foreground">Questions</p>
                    <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">Questions 1-13</h2>
                  </div>
                  <Badge className="rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary-foreground shadow-none">
                    {mode}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {QUESTION_GROUPS.flatMap((group) => group.questions).map((question) => {
                    const answered = Boolean(answers[question.id]?.trim());
                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => document.getElementById(question.id)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black transition",
                          answered
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30"
                        )}
                      >
                        {question.number}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              {QUESTION_GROUPS.map((group) => (
                <div key={group.id} className="rounded-[1.6rem] border border-border/80 bg-card shadow-sm">
                  <div className="border-b border-border/70 px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">{typeLabel(group.type)}</p>
                        <h3 className="mt-1 text-base font-black tracking-tight text-foreground">{group.title}</h3>
                      </div>
                      <Badge className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary shadow-none">
                        {group.questions.length} questions
                      </Badge>
                    </div>
                    <p
                      ref={(node) => {
                        textBlockRefs.current[`group-instruction-${group.id}`] = node;
                      }}
                      data-highlight-text
                      onMouseUp={() => handleTextBlockMouseUp(`group-instruction-${group.id}`)}
                      className="mt-3 text-sm font-medium leading-6 text-muted-foreground"
                      style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                    >
                      {renderHighlightedText(`group-instruction-${group.id}`, group.instruction)}
                    </p>
                  </div>

                  <div className="space-y-4 px-4 py-4 lg:px-5">
                    {group.questions.map((question) => (
                      <div key={question.id} id={question.id} className="rounded-[1.2rem] border border-border/75 bg-muted/20 p-4">
                        <div className="mb-3 flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                            {question.number}
                          </div>
                          <div className="space-y-1">
                            <p
                              ref={(node) => {
                                textBlockRefs.current[`question-prompt-${question.id}`] = node;
                              }}
                              data-highlight-text
                              onMouseUp={() => handleTextBlockMouseUp(`question-prompt-${question.id}`)}
                              className="font-sans text-foreground"
                              style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                            >
                              {renderHighlightedText(`question-prompt-${question.id}`, question.prompt)}
                            </p>
                            {question.instruction ? (
                              <p
                                ref={(node) => {
                                  textBlockRefs.current[`question-instruction-${question.id}`] = node;
                                }}
                                data-highlight-text
                                onMouseUp={() => handleTextBlockMouseUp(`question-instruction-${question.id}`)}
                                className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                              >
                                {renderHighlightedText(`question-instruction-${question.id}`, question.instruction)}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {question.type === "tfng" ? (
                          <div className="flex flex-wrap gap-2 pl-12">
                            {["TRUE", "FALSE", "NOT GIVEN"].map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  if (hasActiveSelection()) return;
                                  setAnswers((current) => ({ ...current, [question.id]: option }));
                                }}
                                className={cn(
                                  "rounded-xl border px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition",
                                  answers[question.id] === option
                                    ? "border-primary/30 bg-primary text-primary-foreground shadow-sm"
                                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                                )}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {question.type === "mcq" ? (
                          <div className="space-y-2 pl-12">
                            {question.options?.map((option, index) => {
                              const optionLetter = String.fromCharCode(65 + index);
                              const optionValue = `${optionLetter}`;
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => {
                                    if (hasActiveSelection()) return;
                                    setAnswers((current) => ({ ...current, [question.id]: optionValue }));
                                  }}
                                  className={cn(
                                    "flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition",
                                    answers[question.id] === optionValue
                                      ? "border-primary/30 bg-primary/10 shadow-sm"
                                      : "border-border bg-card hover:border-primary/30"
                                  )}
                                >
                                  <span className={cn(
                                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                                    answers[question.id] === optionValue
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-foreground"
                                  )}>
                                    {optionLetter}
                                  </span>
                                  <span
                                    ref={(node) => {
                                      textBlockRefs.current[`question-option-${question.id}-${optionLetter}`] = node;
                                    }}
                                    data-highlight-text
                                    onMouseUp={() => handleTextBlockMouseUp(`question-option-${question.id}-${optionLetter}`)}
                                    className="font-sans text-foreground"
                                    style={{ fontSize: `${bodyFontSize}px`, lineHeight: 1.5 }}
                                  >
                                    {renderHighlightedText(`question-option-${question.id}-${optionLetter}`, option)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}

                        {question.type === "gap" ? (
                          <div className="pl-12">
                            <Input
                              value={answers[question.id] ?? ""}
                              onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                              placeholder="Type your answer"
                              className="h-11 max-w-xs rounded-xl border-border bg-card text-sm font-bold"
                              autoComplete="off"
                              spellCheck="false"
                            />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div
          className="pointer-events-none absolute inset-y-0 z-20 hidden lg:flex"
          style={{ left: `calc(${splitRatio}% - 18px)` }}
        >
          <div className="relative flex w-9 items-center justify-center">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/80" />
            <button
              type="button"
              aria-label="Adjust split layout"
              onPointerDown={startSplitDrag}
              className={cn(
                "pointer-events-auto relative flex h-8 w-8 cursor-ew-resize items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-[0_10px_28px_-18px_rgba(15,23,42,0.65)] transition hover:bg-muted hover:text-foreground",
                isDraggingSplit && "border-primary/40 bg-primary/10 text-primary"
              )}
            >
              <MoveHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
