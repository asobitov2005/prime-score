"use client";
import type { TopicFormModalScope } from "./controller";
import { Button, Input, Label, Select, SpeakingIconPicker, Textarea, X } from "../dependencies";

export function TopicFormModalView1({ scope }: { scope: TopicFormModalScope }) {
  const { onClose, meta, isEdit, form, handleSubmit, effectivePart, linkedPart2Id, setLinkedPart2Id, part2Topics, setForm, needsPrompt, bulletLabel, bulletsRaw, setBulletsRaw, selectedIconId, selectedIconTone, setSelectedIconId, setSelectedIconTone, isNewTopic, setIsNewTopic, error, submitting } = scope;
  return (
    (
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
      )
  );
}
