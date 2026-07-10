"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { PreviewTranscriptQuestionLocation, PreviewTranscriptSegment, useMemo, useState } from "../dependencies";
import { PreviewGroup, PreviewParagraph, PreviewQuestion, PreviewSection, answeredQuestionWeight, isMcqMultiple, mcMultipleQuestionWeight, paragraphLabelFromPrompt, sectionKeyForGroup, sectionKeyForParagraph, splitOptionLines, typedOptionView } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { mode, storedCandidateName, examData, answers, hasMounted, strictListeningPhase, strictListeningAudioSectionId, activeSectionId, allQuestions } = scope;
  const previewSections = useMemo(() => {
          const ordered: PreviewSection[] = [];
          const byId = new Map<string, PreviewSection>();
  
          const ensureSection = (id: string, fallbackLabel: string) => {
            const existing = byId.get(id);
            if (existing) {
              return existing;
            }
  
            const next = {
              id,
              label: fallbackLabel,
              title: undefined as string | undefined,
              subtitle: undefined as string | undefined,
              previewLabel: undefined as string | undefined,
              audioUrl: undefined as string | undefined,
              audioDurationSeconds: undefined as number | undefined,
              transcriptSegments: undefined as PreviewTranscriptSegment[] | undefined,
              transcriptQuestionLocations: undefined as PreviewTranscriptQuestionLocation[] | undefined,
              paragraphs: [] as PreviewParagraph[],
              questionGroups: [] as PreviewGroup[],
              questions: [] as PreviewQuestion[],
            };
            byId.set(id, next);
            ordered.push(next);
            return next;
          };
  
          examData.paragraphs.forEach((paragraph) => {
            const id = sectionKeyForParagraph(paragraph);
            const section = ensureSection(id, paragraph.sectionLabel ?? `Passage ${ordered.length + 1}`);
            if (paragraph.sectionLabel) {
              section.label = paragraph.sectionLabel;
            }
            if (paragraph.sectionTitle && !section.title) {
              section.title = paragraph.sectionTitle;
            }
            if (paragraph.sectionSubtitle && !section.subtitle) {
              section.subtitle = paragraph.sectionSubtitle;
            }
            if (paragraph.sectionPreviewLabel && !section.previewLabel) {
              section.previewLabel = paragraph.sectionPreviewLabel;
            }
            if (paragraph.sectionAudioUrl && !section.audioUrl) {
              section.audioUrl = paragraph.sectionAudioUrl;
            }
            if (paragraph.sectionAudioDurationSeconds && !section.audioDurationSeconds) {
              section.audioDurationSeconds = paragraph.sectionAudioDurationSeconds;
            }
            if (paragraph.sectionTranscriptSegments && !section.transcriptSegments) {
              section.transcriptSegments = paragraph.sectionTranscriptSegments;
            }
            if (paragraph.sectionTranscriptQuestionLocations && !section.transcriptQuestionLocations) {
              section.transcriptQuestionLocations = paragraph.sectionTranscriptQuestionLocations;
            }
            section.paragraphs.push(paragraph);
          });
  
          examData.questionGroups.forEach((group) => {
            const id = sectionKeyForGroup(group);
            const section = ensureSection(id, group.sectionLabel ?? `Passage ${ordered.length + 1}`);
            if (group.sectionLabel) {
              section.label = group.sectionLabel;
            }
            if (group.sectionTitle && !section.title) {
              section.title = group.sectionTitle;
            }
            if (group.sectionSubtitle && !section.subtitle) {
              section.subtitle = group.sectionSubtitle;
            }
            if (group.sectionAudioUrl && !section.audioUrl) {
              section.audioUrl = group.sectionAudioUrl;
            }
            if (group.sectionAudioDurationSeconds && !section.audioDurationSeconds) {
              section.audioDurationSeconds = group.sectionAudioDurationSeconds;
            }
            if (group.sectionTranscriptSegments && !section.transcriptSegments) {
              section.transcriptSegments = group.sectionTranscriptSegments;
            }
            if (group.sectionTranscriptQuestionLocations && !section.transcriptQuestionLocations) {
              section.transcriptQuestionLocations = group.sectionTranscriptQuestionLocations;
            }
            section.questionGroups.push(group);
            section.questions.push(...group.questions);
          });
  
          return ordered;
        }, [examData.paragraphs, examData.questionGroups]);

  const currentSection = useMemo(
          () => previewSections.find((section) => section.id === activeSectionId) ?? previewSections[0],
          [activeSectionId, previewSections]
        );

  const currentParagraphs = currentSection?.paragraphs ?? examData.paragraphs;

  const currentQuestionGroups = currentSection?.questionGroups ?? examData.questionGroups;

  const currentQuestions = currentSection?.questions ?? allQuestions;

  const isListeningPreview = examData.testType === "listening";

  const isExamMode = mode === "exam";

  const isReviewMode = mode === "review";

  const isSinglePaneListeningMode = isListeningPreview && !isReviewMode;

  const isStrictListeningExam = isSinglePaneListeningMode && isExamMode;

  const timedSectionId = isStrictListeningExam && strictListeningPhase !== "transfer" && strictListeningPhase !== "complete"
          ? strictListeningAudioSectionId
          : activeSectionId;

  const currentTranscriptSegments = currentSection?.transcriptSegments ?? [];

  const currentTranscriptQuestionLocations = currentSection?.transcriptQuestionLocations ?? [];

  const strictListeningAudioSection = useMemo(
          () => previewSections.find((section) => section.id === strictListeningAudioSectionId) ?? previewSections[0],
          [previewSections, strictListeningAudioSectionId]
        );

  const reviewItems = examData.reviewItems ?? {};

  // In review mode, every answer's evidence quote is highlighted in the passage
        // by default (not just on hover), so learners can see where each answer lives.
        const reviewQuoteList = useMemo(() => {
          if (!isReviewMode) return [] as string[];
          const seen = new Set<string>();
          const quotes: string[] = [];
          for (const item of Object.values(examData.reviewItems ?? {})) {
            const quote = item?.explanationReference?.quote?.trim();
            if (quote && quote.length > 3 && !seen.has(quote.toLowerCase())) {
              seen.add(quote.toLowerCase());
              quotes.push(quote);
            }
          }
          return quotes;
        }, [isReviewMode, examData.reviewItems]);

  const candidateName = hasMounted ? (storedCandidateName || "Guest Candidate") : "Guest Candidate";

  const [showListeningTranscript, setShowListeningTranscript] = useState(false);

  const [showTranscriptAnswerLocations, setShowTranscriptAnswerLocations] = useState(false);

  const answeredCount = useMemo(
          () => allQuestions.reduce((count, question) => count + answeredQuestionWeight(question, answers[question.id]), 0),
          [allQuestions, answers]
        );

  const totalQuestions = useMemo(
          () => allQuestions.reduce((count, question) => count + (isMcqMultiple(question.type) ? mcMultipleQuestionWeight(question) : 1), 0),
          [allQuestions]
        );

  const currentAnsweredCount = useMemo(
          () => currentQuestions.reduce((count, question) => count + answeredQuestionWeight(question, answers[question.id]), 0),
          [answers, currentQuestions]
        );

  const currentTotalQuestions = useMemo(
          () => currentQuestions.reduce((count, question) => count + (isMcqMultiple(question.type) ? mcMultipleQuestionWeight(question) : 1), 0),
          [currentQuestions]
        );

  const matchingInformationParagraphOptions = useMemo(() => {
          const optionsBySection = new Map<string, string[]>();
          const seenBySection = new Map<string, Set<string>>();
  
          examData.paragraphs.forEach((paragraph) => {
            const option = paragraph.label ?? paragraph.paragraphKey;
            if (!/^[A-Z]+$/.test(option)) {
              return;
            }
  
            const sectionKey = paragraph.sectionId ?? paragraph.sectionLabel ?? "section";
            const seen = seenBySection.get(sectionKey) ?? new Set<string>();
            if (seen.has(option)) {
              return;
            }
  
            seen.add(option);
            seenBySection.set(sectionKey, seen);
            optionsBySection.set(sectionKey, [...(optionsBySection.get(sectionKey) ?? []), option]);
          });
  
          return optionsBySection;
        }, [examData.paragraphs]);

  const matchingHeadingTargets = useMemo(() => {
          const targets = new Map<string, { group: PreviewGroup; question: PreviewQuestion }>();
          examData.questionGroups
            .filter((group) => group.type.includes("matching_headings"))
            .forEach((group) => {
              group.questions.forEach((question) => {
                const paragraphKey = paragraphLabelFromPrompt(question.prompt);
                if (!paragraphKey) {
                  return;
                }
                targets.set(`${group.sectionId ?? group.sectionLabel ?? "section"}:${paragraphKey}`, {
                  group,
                  question,
                });
              });
            });
          return targets;
        }, [examData.questionGroups]);

  const matchingHeadingExamples = useMemo(() => {
          const examples = new Map<string, { groupId: string; value: string; prefix: string; text: string; label: string }>();
          examData.questionGroups
            .filter((group) => group.type.includes("matching_headings"))
            .forEach((group) => {
              const options = group.secondaryBlock?.trim()
                ? splitOptionLines(group.secondaryBlock)
                : (group.sharedOptions ?? []);
  
              options.forEach((option, index) => {
                const optionView = typedOptionView(option, index, group.type);
                if (!optionView.fixedParagraphLabel) {
                  return;
                }
                examples.set(`${group.sectionId ?? group.sectionLabel ?? "section"}:${optionView.fixedParagraphLabel}`, {
                  groupId: group.id,
                  value: optionView.value,
                  prefix: optionView.prefix,
                  text: optionView.text,
                  label: optionView.label,
                });
              });
            });
          return examples;
        }, [examData.questionGroups]);

  return { previewSections, currentSection, currentParagraphs, currentQuestionGroups, currentQuestions, isListeningPreview, isExamMode, isReviewMode, isSinglePaneListeningMode, isStrictListeningExam, timedSectionId, currentTranscriptSegments, currentTranscriptQuestionLocations, strictListeningAudioSection, reviewItems, reviewQuoteList, candidateName, showListeningTranscript, setShowListeningTranscript, showTranscriptAnswerLocations, setShowTranscriptAnswerLocations, answeredCount, totalQuestions, currentAnsweredCount, currentTotalQuestions, matchingInformationParagraphOptions, matchingHeadingTargets, matchingHeadingExamples };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
