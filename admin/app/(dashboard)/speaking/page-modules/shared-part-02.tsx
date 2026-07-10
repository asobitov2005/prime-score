"use client";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Pencil, SpeakingTopic, Trash2, cn, useState } from "./dependencies";

import { NewTopicBadge, TopicIconBadge, formatDateTime, parseIsNewTopic, resolveLinkedPart2Title } from "./shared-part-01";



export function TopicCard({
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
