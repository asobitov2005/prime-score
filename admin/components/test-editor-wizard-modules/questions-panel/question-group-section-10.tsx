"use client";
import type { QuestionsPanelScope } from "./controller";
import type { QuestionGroupItem } from "./question-group-item";
import { isDiagramLabelingType } from "../shared";

export function QuestionGroupSection10({ scope, item }: { scope: QuestionsPanelScope; item: QuestionGroupItem }) {
  const { group } = item;
  return (
    <>{isDiagramLabelingType(group.typeId) ? (
                        <div className="grid gap-4">
                          <EditableField label="Diagram Image">
                            <div
                              className="space-y-3 rounded-xl border border-border/70 bg-card/45 p-3"
                              tabIndex={0}
                              onPaste={(event) => handleDiagramImagePaste(group.id, event)}
                            >
                              <input
                                type="file"
                                accept="image/*"
                                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
                                onChange={(event) => handleDiagramImageUpload(group.id, event.target.files?.[0] ?? null)}
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void pasteDiagramImageFromClipboard(group.id)}
                                >
                                  Paste from Clipboard
                                </Button>
                                <p className="text-xs text-muted-foreground">
                                  You can also click here and press Ctrl+V / Cmd+V.
                                </p>
                              </div>
                              {group.diagramImageUrl ? (
                                <div className="space-y-3">
                                  <div className="overflow-hidden rounded-xl border border-border bg-background/70 p-2">
                                    <img
                                      src={group.diagramImageUrl}
                                      alt={group.title}
                                      className="max-h-[220px] w-full rounded-lg object-contain"
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateGroup(group.id, { diagramImageUrl: "" })}
                                  >
                                    Remove image
                                  </Button>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">Upload or paste the diagram asset shown above the blanks in preview and exam mode.</p>
                              )}
                            </div>
                          </EditableField>
                        </div>
                      ) : null}</>
  );
}
