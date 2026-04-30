"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getMatchingOptionViewModel,
  normalizeMatchingAnswerValue,
  shouldAutoLetterMatchingOptions,
} from "@/lib/matching-option-format";
import { cn } from "@/lib/utils";

// Make sure to match the type that is actually passed
export function QuestionRenderer({ question, compact = false, value = "", onValueChange }: any) {
  const isMultipleChoiceSingle = question.question_type ? question.question_type.includes("mc_single") : (question.typeId ? question.typeId.includes("mc_single") : false);
  const isMultipleChoiceMultiple = question.question_type ? question.question_type.includes("mc_multiple") : (question.typeId ? question.typeId.includes("mc_multiple") : false);
  const isTrueFalse = question.question_type ? (question.question_type.includes("true_false") || question.question_type.includes("yes_no")) : (question.typeId ? (question.typeId.includes("true_false") || question.typeId.includes("yes_no")) : false);
  const isMatching = question.question_type ? (question.question_type.includes("matching_headings") || question.question_type.includes("matching_features") || question.question_type.includes("matching_information") || question.question_type.includes("matching_sentence_endings")) : (question.typeId ? (question.typeId.includes("matching_headings") || question.typeId.includes("matching_features") || question.typeId.includes("matching_information") || question.typeId.includes("matching_sentence_endings")) : false);
  const isWordBank = question.question_type ? question.question_type.includes("wordbank") : (question.typeId ? question.typeId.includes("wordbank") : false);

  const typeIdStr = question.question_type || question.typeId || "";
  const sharedOptions = question.options || question.sharedOptions || [];
  const selectedMultipleValues = value
    .split(",")
    .map((item: string) => item.trim())
    .filter(Boolean);
  const inferredSelectionLimit = Array.isArray(question.acceptedAnswers)
    ? question.acceptedAnswers.filter((item: string) => item.trim().length > 0).length
    : 0;
  const selectionLimit = question.selectionLimit ?? (inferredSelectionLimit >= 2 ? inferredSelectionLimit : 2);
  const normalizedMatchingValue = isMatching
    ? normalizeMatchingAnswerValue(value, sharedOptions, typeIdStr)
    : value;
  const toggleMultipleChoiceValue = (letter: string) => {
    if (selectedMultipleValues.includes(letter)) {
      return selectedMultipleValues.filter((item: string) => item !== letter).join(",");
    }
    if (selectedMultipleValues.length >= selectionLimit) {
      return selectedMultipleValues.join(",");
    }
    return [...selectedMultipleValues, letter].join(",");
  };

  if (isMatching && sharedOptions.length > 0) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-2">
        <p className="font-semibold text-[15px] min-w-[120px] shrink-0 text-foreground">{question.prompt}</p>
        <select 
          value={normalizedMatchingValue}
          onChange={(e) => onValueChange(e.target.value)} 
          className="flex h-11 w-full items-center justify-between whitespace-nowrap rounded-md border border-border/60 bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-xs"
        >
          <option value="">Select answer...</option>
          {sharedOptions.map((opt: string, index: number) => {
            const optionView = getMatchingOptionViewModel(opt, index, typeIdStr);
            const isAutoLettered = shouldAutoLetterMatchingOptions(typeIdStr);
            return (
              <option key={opt} value={optionView.value}>
                {isAutoLettered ? optionView.label : optionView.value}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  if (isWordBank && sharedOptions.length > 0) {
    return (
      <div className="space-y-3 py-2">
        {question.prompt && <p className="font-serif leading-relaxed text-[15px] text-foreground">{question.prompt}</p>}
        <select 
          value={value} 
          onChange={(e) => onValueChange(e.target.value)} 
          className="flex h-11 w-full items-center justify-between whitespace-nowrap rounded-md border border-border/60 bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Select from bank...</option>
          {sharedOptions.map((opt: string) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (isMultipleChoiceMultiple) {
    const variants = question.options && question.options.length > 0 && !question.options[0].match(/^[ivx]+\./i) ? question.options : (question.variants && question.variants.length > 0 ? question.variants : ["A", "B", "C", "D", "E"]);
    return (
      <div className="space-y-4">
        {question.prompt && <p className="font-serif font-medium text-foreground text-[15px] leading-relaxed">{question.prompt}</p>}
        <div className="space-y-2.5">
          {variants.map((variant: string, i: number) => {
            const letter = String.fromCharCode(65 + i);
            const checked = selectedMultipleValues.includes(letter);
            return (
              <button
                key={letter}
                type="button"
                className={cn(
                  "flex w-full items-start space-x-3 rounded-xl border p-4 text-left transition-colors",
                  checked ? "border-primary/40 bg-primary/10" : "border-border/50 bg-background/50 hover:bg-muted/50"
                )}
                onClick={() => onValueChange(toggleMultipleChoiceValue(letter))}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mt-0.5 h-4 w-4 rounded border-primary text-primary accent-current"
                />
                <span className="font-serif text-[15px] leading-relaxed cursor-pointer font-normal flex-1">
                  <span className="font-bold mr-2 text-foreground">{letter}.</span> {variant}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (isMultipleChoiceSingle || (typeIdStr.includes("mc_") && !isMultipleChoiceMultiple)) {
    const variants = question.options && question.options.length > 0 && !question.options[0].match(/^[ivx]+\./i) ? question.options : (question.variants && question.variants.length > 0 ? question.variants : ["A", "B", "C", "D"]);
    return (
      <div className="space-y-4">
        {question.prompt && <p className="font-serif font-medium text-foreground text-[15px] leading-relaxed">{question.prompt}</p>}
        <RadioGroup value={value} onValueChange={onValueChange} className="space-y-2.5">
          {variants.map((variant: string, i: number) => {
            const letter = String.fromCharCode(65 + i);
            return (
              <div key={letter} className="flex items-start space-x-3 rounded-xl border border-border/50 bg-background/50 p-4 transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => onValueChange(letter)}>
                <RadioGroupItem value={letter} id={`${question.id}-${letter}`} className="mt-0.5" />
                <Label htmlFor={`${question.id}-${letter}`} className="font-serif text-[15px] leading-relaxed cursor-pointer font-normal flex-1">
                  <span className="font-bold mr-2 text-foreground">{letter}.</span> {variant}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    );
  }

  if (isTrueFalse) {
    const options = typeIdStr.includes("true_false") 
      ? ["TRUE", "FALSE", "NOT GIVEN"] 
      : ["YES", "NO", "NOT GIVEN"];
      
    return (
      <div className="space-y-4 py-2">
        {question.prompt && <p className="font-serif text-[15px] text-foreground leading-relaxed">{question.prompt}</p>}
        <RadioGroup value={value} onValueChange={onValueChange} className="flex flex-wrap gap-3">
          {options.map((opt: string) => (
            <div key={opt} className="flex items-center space-x-2 rounded-lg border border-border/60 bg-muted/20 px-4 py-2 hover:bg-muted transition-colors cursor-pointer" onClick={() => onValueChange(opt)}>
              <RadioGroupItem value={opt} id={`${question.id}-${opt}`} />
              <Label htmlFor={`${question.id}-${opt}`} className="font-bold text-sm cursor-pointer">{opt}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {question.prompt && <p className="font-serif text-[15px] leading-relaxed text-foreground">{question.prompt}</p>}
      <Input
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder="Type your answer..."
        className="max-w-md font-bold h-11 border-border/60 bg-background"
        autoComplete="off"
        spellCheck="false"
      />
    </div>
  );
}
