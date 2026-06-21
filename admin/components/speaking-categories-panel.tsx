"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
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
  Select,
  cn,
} from "@/components/ui";
import {
  formatCategoryLabel,
  getCategoryStyle,
  normalizeCategorySlug,
  speakingApi,
  type SpeakingCategory,
  type SpeakingCategoryScope,
} from "@/lib/speaking-api";

const SCOPE_META: Record<
  SpeakingCategoryScope,
  { label: string; description: string; tone: "neutral" | "success" | "warning" }
> = {
  part1: {
    label: "Part 1",
    description: "Everyday personal themes for short questions.",
    tone: "success",
  },
  cross_part: {
    label: "Part 2 & 3",
    description: "Shared themes for cue cards and discussions.",
    tone: "warning",
  },
  custom: {
    label: "Custom",
    description: "Your own category labels.",
    tone: "neutral",
  },
};

function CategoryTag({ category, label }: { category: string; label?: string | null }) {
  const style = getCategoryStyle(category);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] shadow-sm",
        style.bg,
        style.text,
        style.border,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {label?.trim() || formatCategoryLabel(category)}
    </span>
  );
}

function CategoryCard({
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

export function SpeakingCategoriesPanel({
  onCreated,
  onToast,
}: {
  onCreated?: () => void;
  onToast?: (message: string, tone: "success" | "danger") => void;
}) {
  const [categories, setCategories] = useState<SpeakingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | SpeakingCategoryScope>("all");
  const [name, setName] = useState("");
  const [scope, setScope] = useState<SpeakingCategoryScope>("custom");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await speakingApi.listCategories();
      setCategories(result.items);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load categories.");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return categories.filter((category) => {
      if (scopeFilter !== "all" && category.scope !== scopeFilter) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [
        category.slug,
        category.label ?? "",
        formatCategoryLabel(category.slug),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [categories, scopeFilter, search]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const normalized = normalizeCategorySlug(name);
    if (!normalized) {
      setFormError("Enter a category name.");
      return;
    }

    setSubmitting(true);
    try {
      await speakingApi.createCategory({ name: name.trim(), scope });
      setName("");
      setScope("custom");
      onToast?.("Category created.", "success");
      onCreated?.();
      await fetchCategories();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Failed to create category.";
      setFormError(message);
      onToast?.(message, "danger");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(category: SpeakingCategory) {
    setDeletingSlug(category.slug);
    try {
      await speakingApi.deleteCategory(category.slug);
      onToast?.("Category deleted.", "success");
      await fetchCategories();
      onCreated?.();
    } catch (deleteError) {
      onToast?.(
        deleteError instanceof Error ? deleteError.message : "Failed to delete category.",
        "danger",
      );
    } finally {
      setDeletingSlug(null);
    }
  }

  const previewSlug = normalizeCategorySlug(name);

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Add category</CardTitle>
          <CardDescription>
            Create categories here first, then pick them when adding speaking topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void handleCreate(event)} className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="category_name">Category name</Label>
              <Input
                id="category_name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFormError(null);
                }}
                placeholder="Public transport"
              />
              {previewSlug ? (
                <p className="text-xs text-muted-foreground">
                  Saved as <span className="font-mono">{previewSlug}</span>
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category_scope">Used for</Label>
              <Select
                id="category_scope"
                value={scope}
                onChange={(event) => setScope(event.target.value as SpeakingCategoryScope)}
              >
                <option value="part1">Part 1 topics</option>
                <option value="cross_part">Part 2 & 3 topics</option>
                <option value="custom">General / custom</option>
              </Select>
            </div>

            <Button type="submit" disabled={submitting}>
              <Plus className="h-4 w-4" />
              {submitting ? "Adding…" : "Add category"}
            </Button>
          </form>

          {formError ? (
            <p className="mt-3 text-sm text-danger">{formError}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories…"
            className="h-9 w-64 rounded-lg border border-border bg-card pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <Select
          value={scopeFilter}
          onChange={(event) => setScopeFilter(event.target.value as "all" | SpeakingCategoryScope)}
          className="h-9 w-44"
        >
          <option value="all">All scopes</option>
          <option value="part1">Part 1</option>
          <option value="cross_part">Part 2 & 3</option>
          <option value="custom">Custom</option>
        </Select>

        <button
          type="button"
          onClick={() => void fetchCategories()}
          className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:bg-muted/40"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 text-danger shrink-0" />
          <div>
            <p className="font-semibold text-danger">Failed to load categories</p>
            <p>{error}</p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-2xl bg-muted/40" />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-lg font-bold">No categories yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first category using the form above.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category.slug}
              category={category}
              deleting={deletingSlug === category.slug}
              onDelete={(item) => void handleDelete(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
