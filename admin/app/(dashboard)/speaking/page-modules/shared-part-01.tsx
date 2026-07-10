"use client";

import { AlertCircle, CheckCircle2, PART_META, SPEAKING_ICON_TONE_STYLES, SpeakingPartNumber, SpeakingTopic, SpeakingTopicCreateInput, X, cn, parseTopicIconMetadata, resolveSpeakingIcon, useEffect } from "./dependencies";



export const PARTS: SpeakingPartNumber[] = [1, 2, 3];

export const emptyForm = (part: SpeakingPartNumber): SpeakingTopicCreateInput => ({
  part_number: part,
  topic_title: "",
  prompt_text: "",
  bullet_points: [],
  active: true,
});

export function parseIsNewTopic(metadata: Record<string, unknown> | undefined): boolean {
  return metadata?.is_new_topic === true;
}

export function NewTopicBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex flex-col items-center justify-center rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 leading-none text-orange-600",
        className,
      )}
    >
      <span className="text-[10px] font-black tracking-[0.08em]">NEW</span>
      <span className="mt-0.5 text-[8px] font-semibold tracking-[0.04em]">Topic</span>
    </span>
  );
}

export function defaultIconForPart(part: SpeakingPartNumber): string {
  if (part !== 1) {
    return "home";
  }
  return PART_META[1].defaultIcon ?? "home";
}

export function resolveLinkedPart2Title(
  topic: SpeakingTopic,
  part2Topics: SpeakingTopic[],
): string | null {
  if (topic.part_number !== 3 || !topic.followup_group_key) {
    return null;
  }
  const linked = part2Topics.find((item) => item.followup_group_key === topic.followup_group_key);
  return linked?.topic_title ?? null;
}

export function resolveLinkedPart2Id(topic: SpeakingTopic, part2Topics: SpeakingTopic[]): string {
  if (topic.part_number !== 3 || !topic.followup_group_key) {
    return "";
  }
  const linked = part2Topics.find((item) => item.followup_group_key === topic.followup_group_key);
  return linked?.id ?? "";
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function Toast({
  message,
  tone,
  onClose,
}: {
  message: string;
  tone: "success" | "danger";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 3500);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg max-w-sm",
          tone === "success"
            ? "border-success/30 bg-success/10 text-foreground"
            : "border-danger/30 bg-danger/10 text-foreground",
        )}
      >
        {tone === "success" ? (
          <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
        )}
        <div className="text-sm">{message}</div>
        <button type="button" onClick={onClose} className="ml-2 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function TopicIconBadge({ topic }: { topic: SpeakingTopic }) {
  if (topic.part_number !== 1) {
    return null;
  }

  const { iconId, iconTone } = parseTopicIconMetadata(topic.metadata);
  const resolved = resolveSpeakingIcon(iconId) ?? resolveSpeakingIcon(defaultIconForPart(1));
  if (!resolved) {
    return null;
  }
  const Icon = resolved.Icon;

  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full border",
        SPEAKING_ICON_TONE_STYLES[iconTone],
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
