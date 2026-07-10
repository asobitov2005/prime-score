"use client";
import type { SpeakingTopicsPageScope } from "./controller";
import { AdminSpeakingTopicsLoadingSkeleton, AlertCircle, Badge, Mic2, PART_META, Plus, RefreshCw, Search, SectionHeader, buttonClassName, cn } from "../dependencies";
import { PARTS, Toast, TopicCard } from "../shared";

export function SpeakingTopicsPageView1({ scope }: { scope: SpeakingTopicsPageScope }) {
  const { fetchTopics, setModalMode, setEditingTopic, setModalOpen, activePart, setActivePart, search, setSearch, partCounts, error, loading, filteredTopics, part2Topics, deletingId, handleDeleteTopic, modalMode, editingTopic, modalOpen, setToast, toast } = scope;
  return (
    (
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
      )
  );
}
