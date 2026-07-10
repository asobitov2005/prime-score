"use client";
import type { ContentPanelScope } from "./controller";
import type { ContentSectionItem } from "./section-item";
import { Badge, Button, CardHeader, cn } from "../dependencies";
import { shouldRenderSectionTitle } from "../shared";

export function ContentSectionHeader({ scope, item }: { scope: ContentPanelScope; item: ContentSectionItem }) {
  const { draft, setCollapsedSections, setDeleteConfirmSectionId, removeSection } = scope;
  const { isSectionCollapsed, showDeleteConfirm, sectionLabel, section, contentBlocks, labelledBlocks } = item;
  return (
    <CardHeader className={cn("border-b bg-muted/30 px-5", isSectionCollapsed ? "py-3" : "pt-5 pb-4")}>
                    <div className={cn("flex items-start justify-between gap-4", showDeleteConfirm ? "border-b border-border/70 pb-4" : "")}>
                      <div className={cn(isSectionCollapsed ? "space-y-1" : "space-y-2")}>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Content Section</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="rounded-full bg-primary px-3 py-1 text-xs font-black uppercase text-primary-foreground">
                            {sectionLabel}
                          </div>
                          <h3 className={cn("font-black tracking-tight text-foreground", isSectionCollapsed ? "text-base" : "text-lg")}>
                            {shouldRenderSectionTitle(draft.metadata.type, section.title) ? section.title.trim() : "Untitled section"}
                          </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={section.showLabels ? "success" : "neutral"}>{section.showLabels ? "Labels ON" : "Labels OFF"}</Badge>
                          <Badge tone="neutral">{contentBlocks.length} blocks</Badge>
                          <Badge tone="neutral">{labelledBlocks} labelled</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCollapsedSections((current) => ({
                              ...current,
                              [section.id]: !(current[section.id] ?? false),
                            }))
                          }
                        >
                          {isSectionCollapsed ? "Expand" : "Collapse"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirmSectionId(section.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
    
                    {showDeleteConfirm ? (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">Remove this section?</p>
                          <p className="text-xs text-danger">This removes the content section and all question groups linked to it.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteConfirmSectionId(null)}>
                            Cancel
                          </Button>
                          <Button type="button" variant="danger" size="sm" onClick={() => removeSection(section.id)}>
                            Remove section
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </CardHeader>
  );
}
