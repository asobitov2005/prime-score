"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  Clock3,
  Home,
  MessageCircle,
  Monitor,
  Plane,
  Plus,
  Search,
  Shuffle,
  ShoppingBag,
  Star,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { createApiClient, type SpeakingTopicItem } from "@/lib/api/client";
import {
  isSpeakingTopicIconTone,
  resolveSpeakingTopicIcon,
  type SpeakingTopicIconTone,
} from "@/lib/speaking-topic-icons";
import {
  buildMicrophoneCheckHref,
  buildSpeakingTopicPickerHref,
  clampSpeakingPart,
  MAX_SPEAKING_TOPIC_SELECTION,
  normalizeSpeakingEntryMode,
  supportsMultiTopicSelection,
} from "@/lib/speaking-navigation";
import { cn } from "@/lib/utils";

type SortOption = "popular" | "az";
type TopicTone = "purple" | "blue" | "green" | "orange" | "pink";

type TopicVisual = {
  icon: LucideIcon;
  tone: TopicTone;
};

const toneStyles: Record<
  TopicTone,
  { icon: string; ring: string; selected: string }
> = {
  purple: {
    icon: "bg-[#F3EFFF] text-[#6D4CFF] dark:bg-[#6D4CFF]/15 dark:text-[#A78BFA]",
    ring: "border-[#C4B5FD] dark:border-[#6D4CFF]/35",
    selected:
      "border-[#6D4CFF] bg-[#FBFAFF] shadow-[0_0_0_1px_rgba(109,76,255,0.18),0_18px_40px_-32px_rgba(109,76,255,0.45)] dark:border-[#8B5CF6] dark:bg-[#6D4CFF]/10 dark:shadow-[0_0_0_1px_rgba(139,92,246,0.28),0_18px_40px_-32px_rgba(109,76,255,0.35)]",
  },
  blue: {
    icon: "bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-500/10 dark:text-blue-400",
    ring: "border-[#BFDBFE] dark:border-blue-500/30",
    selected: "border-[#2563EB] bg-[#F8FAFF] dark:border-blue-500 dark:bg-blue-500/10",
  },
  green: {
    icon: "bg-[#ECFDF5] text-[#10B981] dark:bg-emerald-500/10 dark:text-emerald-400",
    ring: "border-[#A7F3D0] dark:border-emerald-500/30",
    selected: "border-[#10B981] bg-[#F8FAFC] dark:border-emerald-500 dark:bg-emerald-500/10",
  },
  orange: {
    icon: "bg-[#FFF7ED] text-[#F97316] dark:bg-orange-500/10 dark:text-orange-400",
    ring: "border-[#FED7AA] dark:border-orange-500/30",
    selected: "border-[#F97316] bg-[#FFFBF5] dark:border-orange-500 dark:bg-orange-500/10",
  },
  pink: {
    icon: "bg-[#FDF2F8] text-[#EC4899] dark:bg-pink-500/10 dark:text-pink-400",
    ring: "border-[#FBCFE8] dark:border-pink-500/30",
    selected: "border-[#EC4899] bg-[#FDF2F8] dark:border-pink-500 dark:bg-pink-500/10",
  },
};

const partFilterOptions = [
  { value: "1", label: "Part 1" },
  { value: "2", label: "Part 2" },
  { value: "3", label: "Part 3" },
] as const;

const sortFilterOptions = [
  { value: "popular", label: "Popular" },
  { value: "az", label: "A–Z" },
] as const;

export function SpeakingTopicPickerClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useMemo(() => createApiClient(), []);

  const part = clampSpeakingPart(Number(searchParams.get("part") ?? "1"));
  const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode") ?? `part_${part}`);
  const testId = searchParams.get("testId");

  const [topics, setTopics] = useState<SpeakingTopicItem[]>([]);
  const [cueCardTitlesByKey, setCueCardTitlesByKey] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [useRandomTopic, setUseRandomTopic] = useState(false);
  const allowsMultiSelect = supportsMultiTopicSelection(part);
  const pageRef = useRef<HTMLDivElement>(null);
  const mainCardRef = useRef<HTMLElement>(null);
  const topicsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const topicsRequest = api.listSpeakingTopics(part);
    const cueCardsRequest = part === 3 ? api.listSpeakingTopics(2) : Promise.resolve({ items: [], total: 0 });

    Promise.all([topicsRequest, cueCardsRequest])
      .then(([topicPayload, cueCardPayload]) => {
        if (cancelled) {
          return;
        }
        setTopics(topicPayload.items);
        if (part === 3) {
          const titlesByKey: Record<string, string> = {};
          for (const cueCard of cueCardPayload.items) {
            if (cueCard.followupGroupKey) {
              titlesByKey[cueCard.followupGroupKey] = cueCard.topicTitle;
            }
          }
          setCueCardTitlesByKey(titlesByKey);
        } else {
          setCueCardTitlesByKey({});
        }
        setSelectedTopicIds([]);
        setUseRandomTopic(false);
      })
      .catch(() => {
        if (!cancelled) {
          setTopics([]);
          setCueCardTitlesByKey({});
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, part]);

  const filteredTopics = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let items = topics;
    if (query) {
      items = items.filter((topic) => {
        const haystack = [
          topic.topicTitle,
          topic.promptText,
          ...topic.categoryTags,
          topic.difficultyLabel ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }
    if (sortBy === "az") {
      return [...items].sort((a, b) => a.topicTitle.localeCompare(b.topicTitle));
    }
    return items;
  }, [searchQuery, sortBy, topics]);

  const selectedTopics = useMemo(
    () => topics.filter((topic) => selectedTopicIds.includes(topic.id)),
    [selectedTopicIds, topics],
  );

  const toggleTopicSelection = useCallback(
    (topicId: string) => {
      setUseRandomTopic(false);
      setSelectedTopicIds((current) => {
        if (current.includes(topicId)) {
          return current.filter((id) => id !== topicId);
        }
        if (allowsMultiSelect) {
          if (current.length >= MAX_SPEAKING_TOPIC_SELECTION) {
            return current;
          }
          return [...current, topicId];
        }
        return [topicId];
      });
    },
    [allowsMultiSelect],
  );

  const handlePartChange = useCallback(
    (nextPart: number) => {
      router.push(buildSpeakingTopicPickerHref(nextPart, testId));
    },
    [router, testId],
  );

  const handleContinue = useCallback(() => {
    const href = buildMicrophoneCheckHref(
      entryMode,
      "strict_exam",
      part,
      testId,
      useRandomTopic ? null : selectedTopics,
      useRandomTopic,
    );
    router.push(href);
  }, [entryMode, part, router, selectedTopics, testId, useRandomTopic]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [part]);

  useEffect(() => {
    const page = pageRef.current;
    const topicsScroll = topicsScrollRef.current;
    if (!page || !topicsScroll) {
      return;
    }

    const getWheelDelta = (event: WheelEvent, pageSize: number) => {
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        return event.deltaY * 16;
      }
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        return event.deltaY * pageSize;
      }
      return event.deltaY;
    };

    const media = window.matchMedia("(min-width: 1024px)");

    const handleWheel = (event: WheelEvent) => {
      if (!media.matches || !page.contains(event.target as Node)) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = topicsScroll;
      const canScrollTopics = scrollHeight > clientHeight + 1;
      const scrollingTopicsDirectly = topicsScroll.contains(event.target as Node);
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      const delta = getWheelDelta(event, clientHeight);

      if (canScrollTopics) {
        if (scrollingTopicsDirectly) {
          if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
            event.preventDefault();
          }
          return;
        }

        if (page.contains(event.target as Node)) {
          event.preventDefault();
          topicsScroll.scrollTop = Math.max(
            0,
            Math.min(scrollHeight - clientHeight, scrollTop + delta),
          );
        }
        return;
      }

      if (page.contains(event.target as Node)) {
        event.preventDefault();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false, capture: true });

    return () => {
      document.removeEventListener("wheel", handleWheel, { capture: true });
    };
  }, [filteredTopics.length, loading, part]);

  return (
    <div
      ref={pageRef}
      className="speaking-night animate-in fade-in duration-500 pb-8 lg:flex lg:h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-2.5rem)] lg:max-h-[calc(100dvh-var(--app-shell-sticky-top,4.5rem)-2.5rem)] lg:min-h-0 lg:flex-col lg:overflow-hidden lg:overscroll-none lg:pb-0"
    >
      <h1 className="shrink-0 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-[1.85rem] lg:mb-3">
        Choose your speaking topic
      </h1>

      <section
        ref={mainCardRef}
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:p-6"
      >
            <div className="shrink-0">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <label className="relative block min-w-0 flex-1">
                  <span className="sr-only">Search topics</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search topics..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-900 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.2)] outline-none transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-[#C4B5FD] focus:ring-4 focus:ring-[#6D4CFF]/10 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:shadow-none dark:placeholder:text-slate-500 dark:hover:border-slate-700 dark:focus:border-[#6D4CFF]/40 dark:focus:ring-[#6D4CFF]/10"
                  />
                </label>

                <div className="flex flex-wrap gap-3 sm:shrink-0">
                  <TopicFilterDropdown
                    ariaLabel="Part"
                    value={String(part)}
                    options={partFilterOptions}
                    onChange={(value) => handlePartChange(Number(value))}
                    className="w-full min-w-[7.5rem] flex-1 sm:w-[132px] sm:flex-none"
                  />
                  <TopicFilterDropdown
                    ariaLabel="Sort topics"
                    value={sortBy}
                    options={sortFilterOptions}
                    onChange={(value) => setSortBy(value as SortOption)}
                    className="w-full min-w-[7.5rem] flex-1 sm:w-[132px] sm:flex-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setUseRandomTopic(true);
                      setSelectedTopicIds([]);
                    }}
                    className={cn(
                      "inline-flex h-11 w-full min-w-[9.5rem] flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition sm:w-auto sm:flex-none",
                      useRandomTopic
                        ? "border-[#6D4CFF] bg-[#FBFAFF] text-[#6D4CFF] shadow-[0_0_0_1px_rgba(109,76,255,0.18)] dark:bg-[#6D4CFF]/10 dark:text-[#C4B5FD]"
                        : "border-[#C4B5FD] bg-white text-[#6D4CFF] hover:bg-[#FBFAFF]/60 dark:border-slate-800 dark:bg-slate-950 dark:text-[#C4B5FD] dark:hover:bg-[#6D4CFF]/5",
                    )}
                  >
                    <Shuffle className="h-4 w-4 shrink-0" />
                    Random topic
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Popular topics</h2>
                {allowsMultiSelect ? (
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Select up to {MAX_SPEAKING_TOPIC_SELECTION} ({selectedTopicIds.length}/{MAX_SPEAKING_TOPIC_SELECTION})
                  </span>
                ) : null}
              </div>

              <div
                ref={topicsScrollRef}
                className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700"
              >
                {loading ? (
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading topics...</p>
                ) : filteredTopics.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    No topics match your search. Try another keyword or use a random topic.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredTopics.map((topic, index) => {
                      const visual = getTopicVisual(topic, index);
                      const tone = toneStyles[visual.tone];
                      const isSelected = !useRandomTopic && selectedTopicIds.includes(topic.id);

                      return (
                        <TopicPickerCard
                          key={topic.id}
                          topic={topic}
                          visual={visual}
                          tone={tone}
                          isSelected={isSelected}
                          linkedCueCardTitle={
                            topic.partNumber === 3 && topic.followupGroupKey
                              ? cueCardTitlesByKey[topic.followupGroupKey] ?? null
                              : null
                          }
                          onToggle={() => toggleTopicSelection(topic.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex shrink-0 flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row dark:border-slate-800">
              <button
                type="button"
                onClick={handleContinue}
                disabled={!useRandomTopic && selectedTopics.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6D4CFF] to-[#2563EB] px-5 text-sm font-semibold text-white shadow-[0_18px_34px_-24px_rgba(109,76,255,0.95)] transition hover:shadow-[0_20px_42px_-24px_rgba(109,76,255,1)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[280px]"
              >
                Continue to microphone check
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                href="/speaking"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 sm:min-w-[120px]"
              >
                Cancel
              </Link>
            </div>
          </section>
    </div>
  );
}

function TopicFilterDropdown({
  ariaLabel,
  value,
  options,
  onChange,
  className,
}: {
  ariaLabel: string;
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className={cn("relative min-w-0", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 text-left shadow-[0_8px_20px_-18px_rgba(15,23,42,0.2)] transition-all dark:bg-slate-950 dark:shadow-none",
          open
            ? "border-[#C4B5FD] ring-4 ring-[#6D4CFF]/10 dark:border-[#6D4CFF]/40 dark:ring-[#6D4CFF]/10"
            : "border-slate-200 hover:border-slate-300 hover:shadow-[0_10px_24px_-18px_rgba(15,23,42,0.28)] dark:border-slate-700 dark:hover:border-slate-600 dark:hover:shadow-none",
        )}
      >
        <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedOption.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500",
            open && "rotate-180 text-[#6D4CFF] dark:text-[#A78BFA]",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-full min-w-[9.5rem] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setOpen(false);
                  onChange(option.value);
                }}
                className={cn(
                  "flex h-9 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-[#F3EFFF] text-[#6D4CFF] dark:bg-[#6D4CFF]/10 dark:text-[#C4B5FD]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50",
                )}
              >
                <span>{option.label}</span>
                {active ? <Check className="h-4 w-4 text-[#6D4CFF] dark:text-[#C4B5FD]" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function TopicPickerCard({
  topic,
  visual,
  tone,
  isSelected,
  linkedCueCardTitle,
  onToggle,
}: {
  topic: SpeakingTopicItem;
  visual: TopicVisual;
  tone: (typeof toneStyles)[TopicTone];
  isSelected: boolean;
  linkedCueCardTitle?: string | null;
  onToggle: () => void;
}) {
  const Icon = visual.icon;
  const isPartTwo = topic.partNumber === 2;
  const isPartThree = topic.partNumber === 3;
  const isCompactCard = isPartTwo || isPartThree;

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative rounded-xl border text-left transition-all duration-200",
        isCompactCard ? "flex min-h-[128px] flex-col" : "min-h-[104px]",
        isSelected
          ? tone.selected
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
      )}
    >
      {isPartTwo ? (
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5">
          <span className={inlineTopicBadgeClassName}>Cue Card</span>
          {topic.isNewTopic ? <NewTopicBadge className="shrink-0" /> : null}
        </div>
      ) : null}

      {!isCompactCard ? (
        <span
          className={cn(
            "absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
            isSelected
              ? "border-transparent bg-[#6D4CFF] text-white"
              : "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900",
          )}
        >
          {isSelected ? <Check className="h-3 w-3" strokeWidth={3} /> : <Plus className="h-3 w-3" />}
        </span>
      ) : null}

      <div
        className={cn(
          "flex h-full flex-1 flex-col p-3",
          isPartTwo ? (topic.isNewTopic ? "pt-14" : "pt-10") : undefined,
        )}
      >
        {isCompactCard ? (
          <>
            <div className="flex min-w-0 flex-1 items-start gap-2 pr-1">
              {isPartThree && topic.isNewTopic ? <NewTopicBadge className="shrink-0" /> : null}
              <div className="min-w-0">
                <span className="block text-sm font-bold leading-snug text-slate-950 dark:text-slate-50">{topic.topicTitle}</span>
                {isPartThree ? (
                  <span className="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">Part 3</span>
                ) : null}
              </div>
            </div>
            <div className={cn("mt-3 flex items-end gap-2", isPartThree ? "justify-between" : "justify-end")}>
              {isPartThree && linkedCueCardTitle ? (
                <span className={cn(topicBadgeClassName, "static max-w-[58%] normal-case tracking-normal")} title={linkedCueCardTitle}>
                  {shortenTopicTitle(linkedCueCardTitle)}
                </span>
              ) : null}
              <span className={chooseTopicButtonClassName(isSelected)}>Choose Topic</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 pr-7">
              {topic.isNewTopic ? <NewTopicBadge className="shrink-0" /> : null}
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", tone.icon)}>
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <span className="block text-sm font-bold leading-snug text-slate-950 dark:text-slate-50">{topic.topicTitle}</span>
                <span className="mt-1 block text-[11px] font-semibold text-slate-500 dark:text-slate-400">{getTopicSubtitle(topic)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </button>
  );
}

const inlineTopicBadgeClassName =
  "inline-flex max-w-full items-center truncate rounded-md border border-[#DDD6FE] bg-[#F5F3FF] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#7C6AE6] dark:border-[#6D4CFF]/25 dark:bg-[#6D4CFF]/10 dark:text-[#C4B5FD]";

const topicBadgeClassName = cn("absolute left-3 top-3", inlineTopicBadgeClassName);

function NewTopicBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex flex-col items-center justify-center rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-2 py-1 leading-none text-[#EA580C] dark:border-[#F97316]/30 dark:bg-[#F97316]/10 dark:text-[#FB923C]",
        className,
      )}
    >
      <span className="text-[10px] font-black tracking-[0.08em]">NEW</span>
      <span className="mt-0.5 text-[8px] font-semibold tracking-[0.04em]">Topic</span>
    </span>
  );
}

function chooseTopicButtonClassName(isSelected: boolean): string {
  return cn(
    "inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-xs font-semibold transition-colors",
    isSelected
      ? "bg-[#6D4CFF] text-white"
      : "border border-[#DDD6FE] bg-[#FAFAFF] text-[#7C6AE6] dark:border-[#6D4CFF]/30 dark:bg-[#6D4CFF]/10 dark:text-[#C4B5FD]",
  );
}

function shortenTopicTitle(title: string, maxLength = 24): string {
  const trimmed = title.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

function getTopicSubtitle(topic: SpeakingTopicItem): string {
  return `Part ${topic.partNumber}`;
}

function getTopicVisual(topic: SpeakingTopicItem, index: number): TopicVisual {
  if (topic.partNumber !== 1) {
    return { icon: MessageCircle, tone: "purple" };
  }

  const iconFromMeta = resolveSpeakingTopicIcon(topic.icon);
  const toneFromMeta = isSpeakingTopicIconTone(topic.iconTone) ? topic.iconTone : null;
  if (iconFromMeta) {
    return { icon: iconFromMeta, tone: toneFromMeta ?? "purple" };
  }

  const title = topic.topicTitle.toLowerCase();
  const palette: TopicVisual[] = [
    { icon: Briefcase, tone: "purple" },
    { icon: Home, tone: "blue" },
    { icon: Users, tone: "green" },
    { icon: Star, tone: "orange" },
    { icon: Clock3, tone: "purple" },
    { icon: UtensilsCrossed, tone: "orange" },
    { icon: Plane, tone: "blue" },
    { icon: Monitor, tone: "purple" },
    { icon: ShoppingBag, tone: "pink" },
  ];

  if (title.includes("work") || title.includes("study")) return { icon: Briefcase, tone: "purple" };
  if (title.includes("hometown") || title.includes("home") || title.includes("place")) return { icon: Home, tone: "blue" };
  if (title.includes("family") || title.includes("person")) return { icon: Users, tone: "green" };
  if (title.includes("hobby") || title.includes("skill")) return { icon: Star, tone: "orange" };
  if (title.includes("routine") || title.includes("daily")) return { icon: Clock3, tone: "purple" };
  if (title.includes("food")) return { icon: UtensilsCrossed, tone: "orange" };
  if (title.includes("travel")) return { icon: Plane, tone: "blue" };
  if (title.includes("technology") || title.includes("object")) return { icon: Monitor, tone: "purple" };
  if (title.includes("shop")) return { icon: ShoppingBag, tone: "pink" };
  if (title.includes("education") || title.includes("city") || title.includes("culture")) return { icon: MessageCircle, tone: "blue" };

  return palette[index % palette.length] ?? { icon: MessageCircle, tone: "purple" };
}
