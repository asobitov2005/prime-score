"use client";

import { AdminTestDraftState } from "./dependencies";

import { extractMatchingOptionValue } from "./shared-part-01";

import { alphabetLabelFromIndex, getMatchingOptionPreview } from "./shared-part-02";

import { isListeningMapLabelingType } from "./shared-part-03";



export function renderAdminPreviewAnswer(
  group: AdminTestDraftState["questionGroups"][number],
  question: AdminTestDraftState["questionGroups"][number]["questions"][number]
) {
  if (group.typeId.includes("true_false")) {
    return (
      <div className="flex flex-wrap gap-2">
        {["TRUE", "FALSE", "NOT GIVEN"].map((option) => (
          <span
            key={option}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground"
          >
            {option}
          </span>
        ))}
      </div>
    );
  }

  if (group.typeId.includes("yes_no")) {
    return (
      <div className="flex flex-wrap gap-2">
        {["YES", "NO", "NOT GIVEN"].map((option) => (
          <span
            key={option}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground"
          >
            {option}
          </span>
        ))}
      </div>
    );
  }

  if (group.typeId.includes("mc_multiple")) {
    return (
      <div className="space-y-2">
        {(question.variants ?? []).map((option, index) => {
          const optionLetter = alphabetLabelFromIndex(index);
          return (
            <div key={`${question.id}-${optionLetter}`} className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 rounded border-2 border-border bg-background" />
              <span className="font-sans text-[14px] leading-[1.45] text-foreground">
                <span className="mr-2 font-black">{optionLetter}.</span>
                {option}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (group.typeId.includes("mc_")) {
    return (
      <div className="space-y-2">
        {(question.variants ?? []).map((option, index) => {
          const optionLetter = alphabetLabelFromIndex(index);
          return (
            <div key={`${question.id}-${optionLetter}`} className="flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black text-foreground">
                {optionLetter}
              </span>
              <span className="font-sans text-[15px] leading-[1.5] text-foreground">{option}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (group.typeId.includes("matching_information")) {
    return (
      <div className="max-w-[180px]">
        <select
          value=""
          onChange={() => undefined}
          className="flex h-10 w-full appearance-none items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground"
        >
          <option value="">Select paragraph</option>
          {group.sharedOptions.map((option) => {
            const value = extractMatchingOptionValue(option);
            return (
              <option key={`${question.id}-${value}`} value={value}>
                {value}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  if (
    group.typeId.includes("matching_features")
    || group.typeId.includes("matching_sentence_endings")
    || group.typeId.includes("listening_matching")
  ) {
    return (
      <div className="max-w-[260px]">
        <select
          value=""
          onChange={() => undefined}
          className="flex h-10 w-full appearance-none items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground"
        >
          <option value="">Select answer</option>
          {group.sharedOptions.map((option, index) => {
            const optionPreview = getMatchingOptionPreview(option, index, group.typeId);
            return (
              <option key={`${question.id}-${optionPreview.value}`} value={optionPreview.value}>
                {optionPreview.label}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  if (isListeningMapLabelingType(group.typeId)) {
    if (group.sharedOptions.length > 0) {
      return (
        <div className="max-w-[220px]">
          <select
            value=""
            onChange={() => undefined}
            className="flex h-10 w-full appearance-none items-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-muted-foreground"
          >
            <option value="">Select map label</option>
            {group.sharedOptions.map((option) => {
              const value = extractMatchingOptionValue(option) || option.trim();
              return (
                <option key={`${question.id}-${value}`} value={value}>
                  {value}
                </option>
              );
            })}
          </select>
        </div>
      );
    }

    return (
      <div className="max-w-xs rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground">
        Type map label
      </div>
    );
  }

  return (
    <div className="max-w-xs rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground">
      Answer input
    </div>
  );
}
