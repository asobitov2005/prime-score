"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Mic2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  SectionHeader,
  Select,
  Textarea,
  buttonClassName,
  cn,
} from "@/components/ui";
import { AdminSpeakingTopicsLoadingSkeleton } from "@/components/loading-skeletons";
import { SpeakingIconPicker, parseTopicIconMetadata } from "@/components/speaking-icon-picker";
import {
  PART_META,
  parseBulletPoints,
  speakingApi,
  type SpeakingPartNumber,
  type SpeakingTopic,
  type SpeakingTopicCreateInput,
} from "@/lib/speaking-api";
import {
  SPEAKING_ICON_TONE_STYLES,
  resolveSpeakingIcon,
  type SpeakingIconTone,
} from "@/lib/speaking-icons";

const PARTS: SpeakingPartNumber[] = [1, 2, 3];

const emptyForm = (part: SpeakingPartNumber): SpeakingTopicCreateInput => ({
  part_number: part,
  topic_title: "",
  prompt_text: "",
  bullet_points: [],
  active: true,
});

function parseIsNewTopic(metadata: Record<string, unknown> | undefined): boolean {
  return metadata?.is_new_topic === true;
}

function NewTopicBadge({ className }: { className?: string }) {
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

function defaultIconForPart(part: SpeakingPartNumber): string {
  if (part !== 1) {
    return "home";
  }
  return PART_META[1].defaultIcon ?? "home";
}

function resolveLinkedPart2Title(
  topic: SpeakingTopic,
  part2Topics: SpeakingTopic[],
): string | null {
  if (topic.part_number !== 3 || !topic.followup_group_key) {
    return null;
  }
  const linked = part2Topics.find((item) => item.followup_group_key === topic.followup_group_key);
  return linked?.topic_title ?? null;
}

function resolveLinkedPart2Id(topic: SpeakingTopic, part2Topics: SpeakingTopic[]): string {
  if (topic.part_number !== 3 || !topic.followup_group_key) {
    return "";
  }
  const linked = part2Topics.find((item) => item.followup_group_key === topic.followup_group_key);
  return linked?.id ?? "";
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Toast({
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

function TopicIconBadge({ topic }: { topic: SpeakingTopic }) {
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

function TopicCard({
  topic,
  part2Topics,
  onEdit,
  onDelete,
  deleting,
}: {
  topic: SpeakingTopic;
  part2Topics: SpeakingTopic[];
  onEdit: (topic: SpeakingTopic) => void;
  onDelete: (topic: SpeakingTopic) => void;
  deleting: boolean;
}) {
  const linkedPart2Title = resolveLinkedPart2Title(topic, part2Topics);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const partTone =
    topic.part_number === 1
      ? "from-sky-500/10 via-transparent to-transparent"
      : topic.part_number === 2
        ? "from-violet-500/10 via-transparent to-transparent"
        : "from-emerald-500/10 via-transparent to-transparent";

  return (
    <Card className="rounded-2xl h-full flex flex-col overflow-hidden border-border/70">
      <div className={cn("h-1.5 w-full bg-gradient-to-r", partTone)} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 text-[11px] font-black text-primary">
                P{topic.part_number}
              </span>
              <TopicIconBadge topic={topic} />
              {parseIsNewTopic(topic.metadata) ? <NewTopicBadge /> : null}
            </div>
            <CardTitle className="text-base leading-snug">{topic.topic_title}</CardTitle>
            {topic.part_number === 2 ? (
              <CardDescription className="line-clamp-2">{topic.prompt_text}</CardDescription>
            ) : null}
          </div>
          <Badge tone={topic.active ? "success" : "paused"} className="shrink-0 text-[10px] uppercase">
            {topic.active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 pt-0">
        {topic.bullet_points.length > 0 ? (
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {topic.bullet_points.slice(0, 4).map((point) => (
              <li key={point} className="flex gap-2">
                <span className="text-primary mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span className="line-clamp-2">{point}</span>
              </li>
            ))}
            {topic.bullet_points.length > 4 ? (
              <li className="text-xs text-muted-foreground/80 pl-3.5">
                +{topic.bullet_points.length - 4} more
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">No bullet points</p>
        )}

        <div className="mt-auto space-y-3 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{formatDateTime(topic.created_at)}</span>
            {linkedPart2Title ? (
              <span className="truncate max-w-[180px] text-right" title={linkedPart2Title}>
                Part 2: {linkedPart2Title}
              </span>
            ) : null}
          </div>

          {confirmDelete ? (
            <div className="rounded-xl border border-danger/20 bg-danger/5 p-3">
              <p className="text-sm font-semibold text-foreground">Delete this topic?</p>
              <p className="mt-1 text-xs text-muted-foreground">This action cannot be undone.</p>
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={deleting}
                  onClick={() => onDelete(topic)}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => onEdit(topic)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-danger hover:bg-danger/10 hover:text-danger"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TopicFormModal({
  mode,
  part,
  topic,
  part2Topics,
  open,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  part: SpeakingPartNumber;
  topic?: SpeakingTopic | null;
  part2Topics: SpeakingTopic[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = mode === "edit";
  const effectivePart = isEdit && topic ? topic.part_number : part;

  const [form, setForm] = useState<SpeakingTopicCreateInput>(() => emptyForm(effectivePart));
  const [bulletsRaw, setBulletsRaw] = useState("");
  const [linkedPart2Id, setLinkedPart2Id] = useState("");
  const [selectedIconId, setSelectedIconId] = useState(defaultIconForPart(1));
  const [selectedIconTone, setSelectedIconTone] = useState<SpeakingIconTone>("purple");
  const [isNewTopic, setIsNewTopic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (isEdit && topic) {
      const iconMeta = parseTopicIconMetadata(topic.metadata);
      setForm({
        part_number: topic.part_number,
        topic_title: topic.topic_title,
        prompt_text: topic.prompt_text,
        bullet_points: topic.bullet_points,
        active: topic.active,
      });
      setBulletsRaw(topic.bullet_points.join("\n"));
      setLinkedPart2Id(resolveLinkedPart2Id(topic, part2Topics));
      setIsNewTopic(parseIsNewTopic(topic.metadata));
      if (topic.part_number === 1) {
        setSelectedIconId(iconMeta.iconId || defaultIconForPart(1));
        setSelectedIconTone(iconMeta.iconTone);
      }
    } else {
      setForm(emptyForm(part));
      setBulletsRaw("");
      setLinkedPart2Id("");
      setIsNewTopic(false);
      if (part === 1) {
        setSelectedIconId(defaultIconForPart(1));
        setSelectedIconTone("purple");
      }
    }
    setError(null);
  }, [open, isEdit, topic, part, part2Topics]);

  const meta = PART_META[effectivePart];
  const needsPrompt = effectivePart === 2;
  const bulletLabel =
    effectivePart === 1 ? "Questions" : effectivePart === 2 ? "Cue-card bullets" : "Discussion questions";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const bulletPoints = parseBulletPoints(bulletsRaw);
    const topicTitle = form.topic_title.trim();
    const promptText = needsPrompt ? (form.prompt_text ?? "").trim() : topicTitle;

    if (!topicTitle) {
      setError(meta.titleLabel ? `${meta.titleLabel} is required.` : "Topic title is required.");
      return;
    }
    if (needsPrompt && !promptText) {
      setError("Prompt text is required.");
      return;
    }
    if (effectivePart === 1 && !selectedIconId) {
      setError("Select an icon for this topic.");
      return;
    }
    if (effectivePart === 3 && !linkedPart2Id) {
      setError("Select a Part 2 topic to link this Part 3 discussion.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        topic_title: topicTitle,
        prompt_text: promptText,
        bullet_points: bulletPoints,
        active: form.active ?? true,
        linked_part2_topic_id: effectivePart === 3 ? linkedPart2Id : null,
        ...(effectivePart === 1
          ? { icon: selectedIconId, icon_tone: selectedIconTone }
          : { icon: null, icon_tone: null }),
        is_new_topic: isNewTopic,
      };

      if (isEdit && topic) {
        await speakingApi.updateTopic(topic.id, payload);
      } else {
        await speakingApi.createTopic({
          ...payload,
          part_number: effectivePart,
        });
      }
      onSaved();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : isEdit
            ? "Failed to update topic."
            : "Failed to create topic.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal backdrop"
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-border bg-card/95 px-6 py-4 backdrop-blur-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">{meta.label}</p>
            <h2 className="text-xl font-bold">{isEdit ? "Edit speaking topic" : "Add speaking topic"}</h2>
            <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 px-6 py-5">
          <div className="grid gap-4">
            {effectivePart === 3 ? (
              <div className="space-y-2">
                <Label htmlFor="linked_part2_topic">Link to Part 2 topic</Label>
                <Select
                  id="linked_part2_topic"
                  value={linkedPart2Id}
                  onChange={(event) => setLinkedPart2Id(event.target.value)}
                >
                  <option value="">Select Part 2 cue card…</option>
                  {part2Topics.map((part2Topic) => (
                    <option key={part2Topic.id} value={part2Topic.id}>
                      {part2Topic.topic_title}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  Part 3 discussion questions will follow the selected Part 2 cue card.
                </p>
                {part2Topics.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Add at least one Part 2 topic before creating Part 3 discussions.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="topic_title">{meta.titleLabel ?? "Topic title"}</Label>
              <Input
                id="topic_title"
                value={form.topic_title}
                onChange={(event) => setForm((current) => ({ ...current, topic_title: event.target.value }))}
                placeholder={
                  effectivePart === 1
                    ? "Home and living space"
                    : effectivePart === 3
                      ? "Education and modern skills"
                      : "A useful skill you learned"
                }
              />
              {meta.titleHint ? <p className="text-xs text-muted-foreground">{meta.titleHint}</p> : null}
            </div>

            {needsPrompt ? (
              <div className="space-y-2">
                <Label htmlFor="prompt_text">Prompt</Label>
                <Textarea
                  id="prompt_text"
                  rows={3}
                  value={form.prompt_text ?? ""}
                  onChange={(event) => setForm((current) => ({ ...current, prompt_text: event.target.value }))}
                  placeholder={meta.promptHint}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="bullet_points">{bulletLabel}</Label>
              <Textarea
                id="bullet_points"
                rows={5}
                value={bulletsRaw}
                onChange={(event) => setBulletsRaw(event.target.value)}
                placeholder={meta.bulletHint}
              />
            </div>

            {effectivePart === 1 ? (
              <SpeakingIconPicker
                part={effectivePart}
                iconId={selectedIconId}
                iconTone={selectedIconTone}
                onIconChange={setSelectedIconId}
                onToneChange={setSelectedIconTone}
              />
            ) : null}

            <div className="flex items-center gap-2">
              <input
                id="is_new_topic"
                type="checkbox"
                checked={isNewTopic}
                onChange={(event) => setIsNewTopic(event.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="is_new_topic" className="cursor-pointer">
                New topic
              </Label>
            </div>
            <p className="-mt-1 text-xs text-muted-foreground">
              Shows a NEW / Topic badge on user speaking cards.
            </p>

            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={form.active ?? true}
                onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Active (visible to users)
              </Label>
            </div>
          </div>

          {error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Add topic"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SpeakingTopicsPage() {
  const [activePart, setActivePart] = useState<SpeakingPartNumber>(1);
  const [topics, setTopics] = useState<SpeakingTopic[]>([]);
  const [part2Topics, setPart2Topics] = useState<SpeakingTopic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingTopic, setEditingTopic] = useState<SpeakingTopic | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "danger" } | null>(null);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await speakingApi.listTopics({
        part_number: activePart,
      });
      setTopics(result.items);
      setTotal(result.total);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load speaking topics.");
      setTopics([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activePart]);

  useEffect(() => {
    void fetchTopics();
  }, [fetchTopics]);

  useEffect(() => {
    void speakingApi.listTopics({ part_number: 2 }).then((result) => {
      setPart2Topics(result.items);
    }).catch(() => {
      setPart2Topics([]);
    });
  }, [topics]);

  async function handleDeleteTopic(topic: SpeakingTopic) {
    setDeletingId(topic.id);
    try {
      await speakingApi.deleteTopic(topic.id);
      setToast({ message: "Speaking topic deleted.", tone: "success" });
      await fetchTopics();
    } catch (deleteError) {
      setToast({
        message: deleteError instanceof Error ? deleteError.message : "Failed to delete topic.",
        tone: "danger",
      });
    } finally {
      setDeletingId(null);
    }
  }

  const filteredTopics = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return topics;
    return topics.filter((topic) =>
      [topic.topic_title, topic.prompt_text, topic.followup_group_key ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [topics, search]);

  const partCounts = useMemo(() => {
    return {
      shown: filteredTopics.length,
      total,
    };
  }, [filteredTopics.length, total]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Content Management"
        title="Speaking Topics"
        description="Manage IELTS Speaking topic cards for Part 1, Part 2, and Part 3 practice."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchTopics()}
              className={buttonClassName({ variant: "outline", size: "sm" })}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => {
                setModalMode("create");
                setEditingTopic(null);
                setModalOpen(true);
              }}
              className={buttonClassName({ variant: "solid", size: "sm" })}
            >
              <Plus className="h-4 w-4" />
              Add {PART_META[activePart].label} topic
            </button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {PARTS.map((part) => {
          const meta = PART_META[part];
          const selected = activePart === part;
          return (
            <button
              key={part}
              type="button"
              onClick={() => setActivePart(part)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                selected
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/20 hover:bg-muted/30",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                    selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {part}
                </span>
                <div>
                  <p className="font-semibold">{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm pb-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, prompt…"
              className="h-9 w-64 rounded-lg border border-border bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          <Badge tone="neutral" className="ml-auto">
            {partCounts.shown} / {partCounts.total} topics
          </Badge>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 text-danger shrink-0" />
          <div>
            <p className="font-semibold text-danger">Failed to load topics</p>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <AdminSpeakingTopicsLoadingSkeleton cards={6} />
      ) : filteredTopics.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="rounded-full bg-primary/10 p-5">
            <Mic2 className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1 max-w-md">
            <p className="text-lg font-bold">No {PART_META[activePart].label} topics yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first speaking card for {PART_META[activePart].label.toLowerCase()} practice.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setModalMode("create");
              setEditingTopic(null);
              setModalOpen(true);
            }}
            className={buttonClassName({ variant: "solid", size: "md" })}
          >
            <Plus className="h-4 w-4" />
            Add {PART_META[activePart].label} topic
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredTopics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              part2Topics={part2Topics}
              deleting={deletingId === topic.id}
              onEdit={(item) => {
                setModalMode("edit");
                setEditingTopic(item);
                setModalOpen(true);
              }}
              onDelete={(item) => void handleDeleteTopic(item)}
            />
          ))}
        </div>
      )}

      <TopicFormModal
        mode={modalMode}
        part={activePart}
        topic={editingTopic}
        part2Topics={part2Topics}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTopic(null);
        }}
        onSaved={() => {
          const partLabel =
            modalMode === "edit" && editingTopic
              ? PART_META[editingTopic.part_number].label
              : PART_META[activePart].label;
          setToast({
            message:
              modalMode === "edit" ? `${partLabel} topic updated.` : `${partLabel} topic created.`,
            tone: "success",
          });
          void fetchTopics();
        }}
      />

      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </div>
  );
}
