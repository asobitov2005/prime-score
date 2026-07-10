"use client";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, SpeakingCategory, Trash2, useState } from "./speaking-categories-panel-dependencies";
import { SCOPE_META } from "./speaking-categories-panel-component-01";
import { CategoryTag } from "./speaking-categories-panel-component-02";

export function CategoryCard({
  category,
  deleting,
  onDelete,
}: {
  category: SpeakingCategory;
  deleting: boolean;
  onDelete: (category: SpeakingCategory) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const scopeMeta = SCOPE_META[category.scope] ?? SCOPE_META.custom;

  return (
    <Card className="rounded-2xl h-full flex flex-col border-border/70">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <CategoryTag category={category.slug} label={category.label} />
            <CardTitle className="text-sm font-mono text-muted-foreground">{category.slug}</CardTitle>
          </div>
          <Badge tone={scopeMeta.tone} className="shrink-0 text-[10px] uppercase">
            {scopeMeta.label}
          </Badge>
        </div>
        <CardDescription>{scopeMeta.description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto space-y-3 border-t border-border/60 pt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{category.topic_count} topic{category.topic_count === 1 ? "" : "s"}</span>
          <span>{category.active ? "Active" : "Inactive"}</span>
        </div>

        {confirmDelete ? (
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-3">
            <p className="text-sm font-semibold text-foreground">Delete this category?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Only unused categories can be deleted.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="sm" disabled={deleting} onClick={() => onDelete(category)}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-danger hover:bg-danger/10 hover:text-danger"
            disabled={category.topic_count > 0}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            {category.topic_count > 0 ? "In use by topics" : "Delete category"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
