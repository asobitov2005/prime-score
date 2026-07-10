"use client";

import { AlertCircle, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Plus, RefreshCw, Search, Select, SpeakingCategory, SpeakingCategoryScope, formatCategoryLabel, normalizeCategorySlug, speakingApi, useCallback, useEffect, useMemo, useState } from "./speaking-categories-panel-dependencies";
import { CategoryCard } from "./speaking-categories-panel-component-03";

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
