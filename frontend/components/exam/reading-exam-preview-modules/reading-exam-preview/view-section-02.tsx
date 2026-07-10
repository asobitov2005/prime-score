"use client";
import type { ReadingExamPreviewScope } from "./controller";
import { GripVertical } from "../dependencies";

export function ReadingExamPreviewSection2({ scope }: { scope: ReadingExamPreviewScope }) {
  const { draggingHeading, draggingWordBank, dragPreviewPosition, headingOptionLookup } = scope;
  return (
    {(draggingHeading || draggingWordBank) && dragPreviewPosition ? (
                <div
                  className="pointer-events-none fixed z-[95] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: dragPreviewPosition.x, top: dragPreviewPosition.y }}
                >
                  <div className="flex max-w-[28rem] items-start gap-3 rounded-xl border border-[#2f436f]/85 bg-background/96 px-3 py-2 shadow-[0_22px_55px_-26px_rgba(15,23,42,0.7)] backdrop-blur-md dark:border-[#89a4d8]/70 dark:bg-[#162033]/96 dark:shadow-[0_22px_55px_-26px_rgba(137,164,216,0.32)]">
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#2f436f]/35 bg-[#2f436f]/[0.07] text-[#2f436f] dark:border-[#4b6498]/45 dark:bg-[#4b6498]/[0.12] dark:text-[#89a4d8]"
                      aria-hidden="true"
                    >
                      <GripVertical className="h-4 w-4" />
                    </span>
                    {(() => {
                      if (draggingWordBank) {
                        return (
                          <span className="text-[15px] font-semibold leading-6 text-foreground">
                            {draggingWordBank.previewLabel ?? draggingWordBank.value}
                          </span>
                        );
                      }
                      if (!draggingHeading) {
                        return null;
                      }
                      const draggingOption = headingOptionLookup.get(`${draggingHeading.groupId}:${draggingHeading.value}`);
                      if (!draggingOption) {
                        return (
                          <span className="text-[15px] font-semibold leading-6 text-foreground">
                            {draggingHeading.value}
                          </span>
                        );
                      }
                      return (
                        <span className="text-[15px] font-semibold leading-6 text-foreground">
                          {draggingOption.prefix}. {draggingOption.text}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              ) : null}
  );
}
