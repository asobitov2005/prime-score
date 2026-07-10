"use client";
import type { WritingResultReadyViewScope } from "./controller";
import { buildAnnotationTooltip, categoryStyle, cn } from "../dependencies";

export function WritingResultReadyViewSection11({ scope }: { scope: WritingResultReadyViewScope }) {
  const { annotatedRef, errorCount, segments, focusedAnnotationIndex, annotations, setActiveAnnotation, activeAnnotation } = scope;
  return (
    <div className="space-y-4">
                    <div
                      ref={annotatedRef}
                      className={cn(
                        "rounded-2xl border border-border/40 bg-muted/20 p-5 leading-8 text-[15px] whitespace-pre-wrap",
                        errorCount > 0 && "max-h-[560px] overflow-y-auto"
                      )}
                    >
                      {segments.map((seg, i) => {
                        if (seg.kind === "text") {
                          return <span key={`t-${i}`}>{seg.text}</span>;
                        }
                        const style = categoryStyle(seg.category);
                        const isActive = focusedAnnotationIndex === seg.index;
                        const replacement = annotations[seg.index]?.replacements?.[0];
                        return (
                          <span key={`m-${seg.index}`} className="inline-flex items-center gap-1 align-baseline">
                            <mark
                              data-anno-idx={seg.index}
                              title={buildAnnotationTooltip(annotations[seg.index] ?? { offset: 0, length: 0, original: "", replacements: [], category: seg.category })}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveAnnotation((prev) => (prev === seg.index ? null : seg.index));
                              }}
                              className={cn(
                                "rounded-md px-1 mx-px cursor-pointer scroll-mt-24 transition-all duration-200",
                                "underline decoration-wavy decoration-2 underline-offset-[5px]",
                                style.underline,
                                isActive ? style.fillActive : style.fill,
                              )}
                            >
                              {seg.text}
                            </mark>
                            {isActive && replacement ? (
                              <span className="inline-flex items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-emerald-700 dark:text-emerald-300">
                                {replacement}
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                    </div>
        
                    {errorCount > 0 ? (
                      <div className="rounded-2xl border border-border/40 bg-card/60 max-h-[560px] overflow-auto">
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/40 bg-card/95 backdrop-blur px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <span>Issue table ({errorCount})</span>
                          {activeAnnotation !== null ? (
                            <button
                              type="button"
                              onClick={() => setActiveAnnotation(null)}
                              className="text-foreground/70 hover:text-foreground normal-case tracking-normal"
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>
                        <table className="w-full min-w-[700px] border-separate border-spacing-0 text-left text-sm">
                          <thead className="sticky top-[33px] z-[9] bg-card/95 text-[10px] uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
                            <tr>
                              <th className="border-b border-border/40 px-3 py-2 font-semibold">#</th>
                              <th className="border-b border-border/40 px-3 py-2 font-semibold">Type</th>
                              <th className="border-b border-border/40 px-3 py-2 font-semibold">Problem</th>
                              <th className="border-b border-border/40 px-3 py-2 font-semibold">Fix</th>
                              <th className="border-b border-border/40 px-3 py-2 font-semibold">Impact</th>
                            </tr>
                          </thead>
                          <tbody>
                            {annotations.map((a, i) => {
                              const s = categoryStyle(a.category);
                              const isActive = focusedAnnotationIndex === i;
                              const replacement = a.replacements?.[0] ?? "";
                              return (
                                <tr
                                  key={i}
                                  role="button"
                                  tabIndex={0}
                                  title={buildAnnotationTooltip(a)}
                                  onClick={() => setActiveAnnotation((prev) => (prev === i ? null : i))}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      setActiveAnnotation((prev) => (prev === i ? null : i));
                                    }
                                  }}
                                  className={cn(
                                    "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isActive ? "bg-muted/70" : "hover:bg-muted/25",
                                  )}
                                >
                                  <td className="border-b border-border/30 px-3 py-3 align-top text-xs font-semibold text-muted-foreground">
                                    {i + 1}
                                  </td>
                                  <td className="border-b border-border/30 px-3 py-3 align-top">
                                    <span
                                      className={cn(
                                        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                        s.chip,
                                      )}
                                    >
                                      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                                      {s.label}
                                    </span>
                                  </td>
                                  <td className="border-b border-border/30 px-3 py-3 align-top">
                                    <div className="space-y-1">
                                      <div className="text-sm font-medium text-foreground/90">
                                        {a.short_message || "Writing issue"}
                                      </div>
                                      <div className={cn("text-xs font-semibold line-through", s.text)}>
                                        {a.original}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="border-b border-border/30 px-3 py-3 align-top">
                                    {replacement ? (
                                      <span className="inline-flex rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                        {replacement}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">No direct replacement</span>
                                    )}
                                  </td>
                                  <td className="border-b border-border/30 px-3 py-3 align-top text-xs leading-5 text-muted-foreground">
                                    <span className="line-clamp-3">
                                      {a.band_impact || a.explanation || "Open this row to view details."}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
  );
}
