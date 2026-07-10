"use client";
import type { BaseScope } from "./base";
import { bandTone, buildAnnotationSentencePreview, buildCriterionInsights, getTargetBandActions, normalizedEssayText, toBandNumber } from "../dependencies";

export function useControllerPart1(scope: BaseScope) {
  const { scope } = scope;
  const { result, activeAnnotation, setActiveAnnotation, activeVersion, setActiveVersion, desiredScore, copiedAnnotation, annotatedRef, annotations, segments, copyText } = scope;

  const overall = toBandNumber(result.overall_band);

  const storedDesiredScore = desiredScore;

  const resultDesiredScore = result.desired_score !== null && result.desired_score !== undefined
        ? toBandNumber(result.desired_score)
        : null;

  const effectiveDesiredScore = resultDesiredScore && resultDesiredScore > 0 ? resultDesiredScore : storedDesiredScore;

  const potential = result.potential_band !== null && result.potential_band !== undefined
        ? toBandNumber(result.potential_band)
        : null;

  const overallTone = bandTone(overall);

  const wordPenalty = toBandNumber(result.word_count_penalty);

  const errorCount = annotations.length;

  const focusedAnnotationIndex = activeAnnotation;

  const activeAnno = focusedAnnotationIndex !== null ? annotations[focusedAnnotationIndex] ?? null : null;

  const activeAnnoSentencePreview = activeAnno
        ? buildAnnotationSentencePreview(result.essay_text, activeAnno)
        : null;

  const hasImprovedTextChanges = Boolean(
        result.improved_version
          && normalizedEssayText(result.improved_version) !== normalizedEssayText(result.essay_text)
      );

  const taskBadgeLabel = result.task_type === "task_1" ? "Task 1" : "Task 2";

  const delta = potential !== null ? potential - overall : 0;

  const criterionInsights = buildCriterionInsights(result);

  const strongestCriterion = [...criterionInsights].sort((a, b) => b.band - a.band)[0] ?? null;

  const weakestCriterion = [...criterionInsights].sort((a, b) => a.band - b.band)[0] ?? null;

  const vocabularySuggestions = result.vocabulary_suggestions ?? [];

  const checklist = result.checklist ?? [];

  const errorPatterns = result.error_patterns ?? [];

  const selectedBenchmarks = result.selected_benchmarks ?? [];

  const confidence = result.confidence || "Medium";

  const possibleScoreRange = result.possible_score_range || `${overall.toFixed(1)}-${overall.toFixed(1)}`;

  const targetActions = getTargetBandActions({
        actionPlan: result.action_plan,
        annotations,
        checklist,
        currentBand: overall,
        desiredScore: effectiveDesiredScore,
        errorPatterns,
        result,
      });

  return { result, activeAnnotation, setActiveAnnotation, activeVersion, setActiveVersion, desiredScore, copiedAnnotation, annotatedRef, annotations, segments, copyText, overall, storedDesiredScore, resultDesiredScore, effectiveDesiredScore, potential, overallTone, wordPenalty, errorCount, focusedAnnotationIndex, activeAnno, activeAnnoSentencePreview, hasImprovedTextChanges, taskBadgeLabel, delta, criterionInsights, strongestCriterion, weakestCriterion, vocabularySuggestions, checklist, errorPatterns, selectedBenchmarks, confidence, possibleScoreRange, targetActions };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
