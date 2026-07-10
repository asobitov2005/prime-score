"use client";

import { Briefcase, Check, Clock3, Home, MessageCircle, Monitor, Plane, Plus, ShoppingBag, SpeakingTopicItem, Star, Users, UtensilsCrossed, cn, isSpeakingTopicIconTone, resolveSpeakingTopicIcon } from "./dependencies";

import { TopicTone, TopicVisual, toneStyles } from "./shared-part-01";



export function TopicPickerCard({
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

export const inlineTopicBadgeClassName =
  "inline-flex max-w-full items-center truncate rounded-md border border-[#DDD6FE] bg-[#F5F3FF] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[#7C6AE6] dark:border-[#6D4CFF]/25 dark:bg-[#6D4CFF]/10 dark:text-[#C4B5FD]";

export const topicBadgeClassName = cn("absolute left-3 top-3", inlineTopicBadgeClassName);

export function NewTopicBadge({ className }: { className?: string }) {
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

export function chooseTopicButtonClassName(isSelected: boolean): string {
  return cn(
    "inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-xs font-semibold transition-colors",
    isSelected
      ? "bg-[#6D4CFF] text-white"
      : "border border-[#DDD6FE] bg-[#FAFAFF] text-[#7C6AE6] dark:border-[#6D4CFF]/30 dark:bg-[#6D4CFF]/10 dark:text-[#C4B5FD]",
  );
}

export function shortenTopicTitle(title: string, maxLength = 24): string {
  const trimmed = title.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getTopicSubtitle(topic: SpeakingTopicItem): string {
  return `Part ${topic.partNumber}`;
}

export function getTopicVisual(topic: SpeakingTopicItem, index: number): TopicVisual {
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
