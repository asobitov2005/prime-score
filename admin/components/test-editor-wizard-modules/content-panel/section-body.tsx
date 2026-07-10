"use client";
import type { ContentPanelScope } from "./controller";
import type { ContentSectionItem } from "./section-item";
import { Button, CardContent, Input, ProgressBar, ReactDragEvent, Textarea, cn } from "../dependencies";
import { EditableField, formatElapsedDuration, formatTranscriptTimestamp, renderBraceBoldText } from "../shared";

export function ContentSectionBody({ scope, item }: { scope: ContentPanelScope; item: ContentSectionItem }) {
  const { draft, updateSection, getIeltsIntroStr, isUsingFullTestAudio, transcribingSectionId, regenerateTranscript, cancelTranscriptGeneration, draggingSectionId, setDraggingSectionId, handleAudioUpload, uploadingSectionId, transcriptProgressBySection } = scope;
  const { isSectionCollapsed, section, idx } = item;
  return (
    {!isSectionCollapsed ? (
                    <CardContent className="space-y-5 p-5">
                      <EditableField label="Section Title">
                        <Input
                          className="h-11 bg-background font-bold"
                          placeholder={draft.metadata.type === "listening" ? "Optional section title" : "Enter Passage Title (e.g. The Giant Squid)"}
                          value={section.title}
                          onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        />
                      </EditableField>
    
                      <div className="flex items-start gap-3 rounded-lg border border-primary/10 bg-primary/5 p-4">
                        <div className="rounded bg-primary/10 p-1.5 text-primary">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-primary">Instruction Preview</p>
                          <p className="text-sm font-medium italic leading-relaxed text-foreground/80">
                            {getIeltsIntroStr(idx)}
                          </p>
                        </div>
                      </div>
    
                      <div className="space-y-3">
                        {draft.metadata.type === "listening" ? (
                          <>
                            {isUsingFullTestAudio ? (
                              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">Shared Full-Test Audio</p>
                                    <p className="text-xs text-muted-foreground">
                                      This section inherits the audio uploaded at the top of the content page.
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {section.audioUrl ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={transcribingSectionId === section.id}
                                        onClick={() => void regenerateTranscript(section)}
                                      >
                                        {transcribingSectionId === section.id ? "Generating..." : "Regenerate Transcript"}
                                      </Button>
                                    ) : null}
                                    {transcribingSectionId === section.id ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={() => void cancelTranscriptGeneration(section.id)}
                                      >
                                        Cancel
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                                {section.audioUrl ? (
                                  <audio className="mt-4 w-full" controls src={section.audioUrl} />
                                ) : null}
                              </div>
                            ) : (
                              <>
                                <EditableField label="Audio URL">
                                  <Input
                                    className="h-11 bg-background font-medium"
                                    placeholder="Uploaded audio URL appears here"
                                    value={section.audioUrl || ""}
                                    onChange={(e) => updateSection(section.id, {
                                      audioUrl: e.target.value,
                                      mediaKind: "audio",
                                      transcript: "",
                                      transcriptSegments: [],
                                      transcriptQuestionLocations: [],
                                    })}
                                  />
                                </EditableField>
    
                                <div
                                  className={cn(
                                    "rounded-xl border border-dashed p-4 transition-colors",
                                    draggingSectionId === section.id
                                      ? "border-primary bg-primary/5"
                                      : "border-border/70 bg-muted/20",
                                  )}
                                  onDragOver={(event: ReactDragEvent<HTMLDivElement>) => {
                                    event.preventDefault();
                                    if (event.dataTransfer.types.includes("Files")) {
                                      event.dataTransfer.dropEffect = "copy";
                                      setDraggingSectionId(section.id);
                                    }
                                  }}
                                  onDragLeave={(event: ReactDragEvent<HTMLDivElement>) => {
                                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                      setDraggingSectionId((current) => (current === section.id ? null : current));
                                    }
                                  }}
                                  onDrop={(event: ReactDragEvent<HTMLDivElement>) => {
                                    event.preventDefault();
                                    const file = event.dataTransfer.files?.[0] ?? null;
                                    void handleAudioUpload(section.id, file);
                                  }}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">Audio Asset</p>
                                      <p className="text-xs text-muted-foreground">
                                        Drag and drop audio here. Transcript generation is paused for now.
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {section.audioUrl ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          disabled={transcribingSectionId === section.id}
                                          onClick={() => void regenerateTranscript(section)}
                                        >
                                          {transcribingSectionId === section.id ? "Generating..." : "Regenerate Transcript"}
                                        </Button>
                                      ) : null}
                                      {transcribingSectionId === section.id ? (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-destructive hover:bg-destructive/10"
                                          onClick={() => void cancelTranscriptGeneration(section.id)}
                                        >
                                          Cancel
                                        </Button>
                                      ) : null}
                                      <label
                                        className={cn(
                                          "inline-flex items-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground",
                                          transcribingSectionId === section.id
                                            ? "cursor-not-allowed opacity-50"
                                            : "cursor-pointer hover:bg-muted/40"
                                        )}
                                      >
                                        {uploadingSectionId === section.id ? "Uploading..." : "Upload Audio"}
                                        <input
                                          type="file"
                                          accept="audio/*"
                                          className="hidden"
                                          disabled={transcribingSectionId === section.id}
                                          onChange={(event) => void handleAudioUpload(section.id, event.target.files?.[0] ?? null)}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                  {section.audioDurationSeconds ? (
                                    <p className="mt-3 text-xs font-medium text-muted-foreground">
                                      Detected duration: {section.audioDurationSeconds}s
                                    </p>
                                  ) : null}
                                  {section.audioUrl ? (
                                    <audio className="mt-4 w-full" controls src={section.audioUrl} />
                                  ) : null}
                                </div>
                              </>
                            )}
    
                            <div className="rounded-xl border border-border/70 bg-muted/15 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">Generated Transcript</p>
                                  <p className="text-xs text-muted-foreground">
                                    Transcript generation is manual for now. Click regenerate only when you need it.
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                                  <span>{section.transcriptSegments?.length ?? 0} segments</span>
                                  <span>{section.transcriptQuestionLocations?.length ?? 0} answer anchors</span>
                                </div>
                              </div>
                              {transcribingSectionId === section.id ? (
                                <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                                  <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-foreground">
                                      {transcriptProgressBySection[section.id]?.label ?? "Generating transcript with timestamps..."}
                                    </p>
                                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                                      {formatElapsedDuration(
                                        Date.now() - (transcriptProgressBySection[section.id]?.startedAt ?? Date.now())
                                      )}
                                    </span>
                                  </div>
                                  <ProgressBar
                                    value={transcriptProgressBySection[section.id]?.value ?? 8}
                                    className="h-2.5 bg-primary/10"
                                  />
                                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
                                    <span>{Math.round(transcriptProgressBySection[section.id]?.value ?? 8)}%</span>
                                    <span>Transcript job is running in the background</span>
                                  </div>
                                </div>
                              ) : section.transcriptSegments && section.transcriptSegments.length > 0 ? (
                                <div className="mt-4 max-h-[320px] space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-background/90 p-3">
                                  {section.transcriptSegments.map((segment) => (
                                    <div key={segment.id} className="grid grid-cols-[56px_minmax(0,1fr)] items-start gap-3 rounded-lg px-2 py-2">
                                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                        {formatTranscriptTimestamp(segment.startSec)}
                                      </span>
                                      <p className="text-sm leading-relaxed text-foreground">
                                        {renderBraceBoldText(segment.text, `${section.id}-segment-${segment.id}`)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : section.transcript?.trim() ? (
                                <div className="mt-4 max-h-[320px] overflow-y-auto rounded-xl border border-border/60 bg-background/90 p-4">
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                                    {renderBraceBoldText(section.transcript.trim(), `${section.id}-transcript`)}
                                  </p>
                                </div>
                              ) : (
                                <p className="mt-4 text-sm text-muted-foreground">
                                  Upload audio first. Transcript, timestamps, and answer anchors are paused until you regenerate manually.
                                </p>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <h4 className="flex items-center gap-2 text-sm font-bold uppercase tracking-tighter text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M9 12h6"/><path d="M8 17h8"/><path d="M12 12v10"/><path d="M12 22l-3-3"/><path d="M12 22l3-3"/></svg>
                                Writing Zone
                              </h4>
                              <Button
                                type="button"
                                variant={section.showLabels ? "solid" : "outline"}
                                size="sm"
                                className="h-8 text-xs font-bold"
                                onClick={() => updateSection(section.id, { showLabels: !section.showLabels })}
                              >
                                {section.showLabels ? "Labels: ON (A, B, C)" : "Labels: OFF"}
                              </Button>
                            </div>
                            <div className="relative">
                              <Textarea
                                className="min-h-[450px] resize-y border-2 p-6 font-serif text-base leading-relaxed shadow-inner transition-all focus-visible:border-primary"
                                value={section.content}
                                onChange={(e) => updateSection(section.id, { content: e.target.value, paragraphs: [] })}
                                placeholder="Type or paste the passage text here. Use a blank line (double Enter) to separate paragraphs."
                              />
                              <div className="pointer-events-none absolute bottom-4 right-4 opacity-20">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  ) : null}
  );
}
