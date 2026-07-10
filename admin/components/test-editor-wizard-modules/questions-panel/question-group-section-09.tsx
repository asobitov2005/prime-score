"use client";
import type { QuestionsPanelScope } from "./controller";
import type { QuestionGroupItem } from "./question-group-item";
import { QuestionGroupSection8 } from "./question-group-section-09.tsx";

export function QuestionGroupSection7({ scope, item }: { scope: QuestionsPanelScope; item: QuestionGroupItem }) {
  const { questionEditorGridRefs } = scope;
  const { group, questionEditorGridStyle } = item;
  return (
    <div
                        ref={(node) => {
                          questionEditorGridRefs.current[group.id] = node;
                        }}
                        className="grid gap-3 border-t border-dashed border-primary/20 pt-4 md:[grid-template-columns:minmax(0,var(--question-block-width))_minmax(180px,1fr)]"
                        style={questionEditorGridStyle}
                      >
                        {!group.typeId.includes("matching_headings") && (
                          <div
                            className="min-w-0 overflow-hidden space-y-2"
                            style={{ width: clampedQuestionBlockWidth ? `${clampedQuestionBlockWidth}px` : undefined }}
                          >
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Questions</p>
                            <textarea
                              ref={(node) => {
                                questionBlockRefs.current[group.id] = node;
                              }}
                              className={cn(
                                "block rounded-md border border-input bg-muted/30 px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                                "w-full md:min-w-[320px] max-w-[1200px] overflow-auto",
                                isMultipleChoiceMultipleType(group.typeId) ? "min-h-[132px]" : "min-h-[250px]"
                              )}
                              style={{
                                resize: "both",
                                height: questionBlockSizes[group.id]?.height ? `${questionBlockSizes[group.id].height}px` : undefined,
                              }}
                              value={group.questionBlock || ""}
                              onChange={(e) => updateGroup(group.id, { questionBlock: e.target.value })}
                              placeholder={isBracketCompletionType(group.typeId)
                                ? getCompletionQuestionBlockPlaceholder(group.typeId)
                                : isBinaryStatementType(group.typeId)
                                  ? "Other countries had built underground railways before the Metropolitan line opened.\nThe first trains were designed for passengers in warmer climates.\nSteam engines were initially used on the route."
                                    : isMatchingInformationType(group.typeId)
                                      ? "a reference to early transport problems\na comparison with a later engineering solution\nan example of public criticism"
                                    : isMultipleChoiceMultipleType(group.typeId)
                                      ? "<Which TWO changes improved the service?>\nLower ticket prices\nFaster trains\nMore stations\nLonger opening hours\nBetter maps\n\n<Which TWO problems remained?>\nNoise\nCrowding\nLighting\nSignage\nCost"
                                      : group.typeId.includes("mc_") 
                                        ? "<Question Text?>\nOption One\nOption Two\nOption Three" 
                                        : "Statement or sentence here..."}
                            />
                          </div>
                        )}
                        <QuestionGroupSection8 scope={scope} item={item} />
                      </div>
  );
}
