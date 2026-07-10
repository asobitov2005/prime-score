"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { AdminTestDraftQuestion, AdminTestDraftQuestionGroup, ReactClipboardEvent, adminApi } from "../dependencies";
import { analyzeBinaryStatementGroup, analyzeMatchingHeadingsGroup, clipboardImageFileName, createDraftId, defaultInstructions, expandMapOptionRangeLines, extractClipboardImageFile, formatQuestionRange, isBinaryStatementType, isBracketCompletionType, isListeningMapFreeTextType, isListeningMapOptionType, isMatchingInformationType, isMultipleChoiceMultipleType, isStructuralGroupUpdate, normalizeMatchingHeadingsAnswerBlockInput, normalizeQuestionGroups, paragraphLabelsForSection, parseBracketCompletionAnswers, parseMcMultipleAcceptedAnswers, parseMcSingleAcceptedAnswers, parseMultipleChoiceMultipleAnswerGroups, parseMultipleChoiceQuestionBlock, parseMultipleChoiceQuestionBlocks, parseWordBankAcceptedAnswers, reorderQuestionGroupsForDrop, splitNonEmptyLines, totalQuestionSlots } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { setDraft } = scope;
  const handleDiagramImageUpload = (groupId: string, file?: File | null) => {
      if (!file) return;
      void adminApi.uploadImage(file).then((asset) => {
        updateGroup(groupId, { diagramImageUrl: asset.publicUrl });
      }).catch(() => undefined);
    };

  const handleDiagramImagePaste = (groupId: string, event: ReactClipboardEvent<HTMLDivElement>) => {
      const file = extractClipboardImageFile(event.clipboardData?.items);
      if (!file) {
        return;
      }
  
      event.preventDefault();
      handleDiagramImageUpload(groupId, file);
    };

  const pasteDiagramImageFromClipboard = async (groupId: string) => {
      if (typeof navigator === "undefined" || !navigator.clipboard || typeof navigator.clipboard.read !== "function") {
        return;
      }
  
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const clipboardItem of clipboardItems) {
          const imageType = clipboardItem.types.find((type) => type.startsWith("image/"));
          if (!imageType) {
            continue;
          }
  
          const blob = await clipboardItem.getType(imageType);
          const file = new File([blob], clipboardImageFileName(imageType), { type: imageType });
          handleDiagramImageUpload(groupId, file);
          return;
        }
      } catch {
        // Browser permission/security policies can block direct clipboard reads.
      }
    };

  const updateGroup = (groupId: string, updates: Partial<AdminTestDraftQuestionGroup>) => {
      setDraft((current) => {
        let nextGroups = (current.questionGroups ?? []).map((g) => {
            if (g.id !== groupId) return g;
  
            let newGroup = { ...g, ...updates };
  
            if (updates.typeId && updates.typeId !== g.typeId) {
              newGroup.instructions = defaultInstructions[updates.typeId] || newGroup.instructions;
              if (isListeningMapOptionType(updates.typeId)) {
                newGroup.sharedOptions = expandMapOptionRangeLines(newGroup.secondaryBlock ?? "");
              } else if (isListeningMapFreeTextType(updates.typeId)) {
                newGroup.sharedOptions = [];
              }
            }
  
            if (newGroup.typeId.includes("matching_headings")) {
              newGroup.answerBlock = normalizeMatchingHeadingsAnswerBlockInput(newGroup.answerBlock ?? "");
            }
  
            const shouldRebuildFromBlocks =
              updates.questionBlock !== undefined
              || updates.answerBlock !== undefined
              || updates.secondaryBlock !== undefined;
            const shouldRebuildMatchingHeadings =
              newGroup.typeId.includes("matching_headings")
              && (
                shouldRebuildFromBlocks
                || updates.sectionId !== undefined
                || updates.questionStart !== undefined
              );
            const shouldRebuildMatchingInformation =
              isMatchingInformationType(newGroup.typeId)
              && (
                shouldRebuildFromBlocks
                || updates.sectionId !== undefined
                || updates.questionStart !== undefined
              );
            const shouldRebuildBracketCompletion =
              isBracketCompletionType(newGroup.typeId)
              && (
                shouldRebuildFromBlocks
                || updates.questionStart !== undefined
              );
            const shouldRebuildBinaryStatements =
              isBinaryStatementType(newGroup.typeId)
              && (
                shouldRebuildFromBlocks
                || updates.questionStart !== undefined
              );
  
            if (shouldRebuildFromBlocks || shouldRebuildMatchingHeadings || shouldRebuildMatchingInformation || shouldRebuildBracketCompletion || shouldRebuildBinaryStatements) {
              const qBlock = updates.questionBlock ?? g.questionBlock ?? "";
              const aBlock = updates.answerBlock ?? g.answerBlock ?? "";
              const sBlock = updates.secondaryBlock ?? g.secondaryBlock ?? "";
  
              const isMatchingHeadings = newGroup.typeId.includes("matching_headings");
              const isMatchingInformation = isMatchingInformationType(newGroup.typeId);
              const isBracketCompletion = isBracketCompletionType(newGroup.typeId);
              const isBinaryStatements = isBinaryStatementType(newGroup.typeId);
              const isMultipleChoiceMultiple = isMultipleChoiceMultipleType(newGroup.typeId);
              const parsedMultipleChoiceBlocks = newGroup.typeId.includes("mc_")
                ? parseMultipleChoiceQuestionBlocks(qBlock)
                : [];
              const qLines = newGroup.typeId.includes("mc_")
                ? parsedMultipleChoiceBlocks.map((block) => block.prompt)
                : isMatchingInformation
                  ? splitNonEmptyLines(qBlock)
                  : qBlock.split("\n\n").map((line) => line.trim()).filter(Boolean);
              const aLines = aBlock.split("\n").map((line) => line.trim()).filter(Boolean);
              const newQuestions: AdminTestDraftQuestion[] = [];
  
              if (isMatchingInformation) {
                const targetSection = current.content.sections.find((section) => section.id === newGroup.sectionId);
                newGroup.sharedOptions = paragraphLabelsForSection(targetSection);
              } else if (
                newGroup.typeId.includes("matching_headings")
                || newGroup.typeId.includes("matching_features")
                || newGroup.typeId.includes("matching_sentence_endings")
                || newGroup.typeId.includes("listening_matching")
                || newGroup.typeId.includes("wordbank")
              ) {
                newGroup.sharedOptions = sBlock.split("\n").map((line) => line.trim()).filter(Boolean);
              } else if (isListeningMapOptionType(newGroup.typeId)) {
                newGroup.sharedOptions = expandMapOptionRangeLines(sBlock);
              } else {
                newGroup.sharedOptions = [];
              }
  
              if (isMatchingHeadings) {
                newQuestions.push(...analyzeMatchingHeadingsGroup(newGroup, current.content.sections).generatedQuestions);
              } else if (isBracketCompletion) {
                const markerCount = (qBlock.match(/\[\]/g) ?? []).length;
                for (let index = 0; index < markerCount; index += 1) {
                  const existingQuestion = g.questions[index];
                  const questionNumber = newGroup.questionStart + index;
                  newQuestions.push({
                    id: existingQuestion?.id ?? createDraftId("draft-q"),
                    label: `${questionNumber}`,
                    prompt: `Blank ${questionNumber}`,
                    acceptedAnswers: newGroup.typeId.includes("wordbank")
                      ? parseWordBankAcceptedAnswers(aLines[index] ?? "", newGroup.sharedOptions)
                      : parseBracketCompletionAnswers(aLines[index] ?? ""),
                    explanation: existingQuestion?.explanation ?? "",
                    variants: [],
                  });
                }
              } else if (isBinaryStatements) {
                newQuestions.push(...analyzeBinaryStatementGroup(newGroup).generatedQuestions);
              } else {
                const multipleChoiceAnswerGroups = isMultipleChoiceMultiple
                  ? parseMultipleChoiceMultipleAnswerGroups(aBlock)
                  : [];
                let nextQuestionNumber = newGroup.questionStart;
  
                qLines.forEach((qText, index) => {
                  const existingQuestion = g.questions[index];
                  let prompt = qText;
                  let variants: string[] = [];
                  let acceptedAnswers: string[] = [];
  
                  if (newGroup.typeId.includes("mc_")) {
                    const parsedQuestion = parsedMultipleChoiceBlocks[index] ?? parseMultipleChoiceQuestionBlock(qText);
                    prompt = parsedQuestion.prompt;
                    variants = parsedQuestion.variants;
                  }
  
                  if (isMultipleChoiceMultiple) {
                    acceptedAnswers = parseMcMultipleAcceptedAnswers(
                      multipleChoiceAnswerGroups[index] ?? [],
                      variants,
                    );
                  } else if (newGroup.typeId.includes("mc_") && aLines[index]) {
                    acceptedAnswers = parseMcSingleAcceptedAnswers(aLines[index], variants);
                  } else if (aLines[index]) {
                    acceptedAnswers = aLines[index].split("|").map((answer) => answer.trim()).filter(Boolean);
                  }
  
                  const slotCount = isMultipleChoiceMultiple ? Math.max(1, acceptedAnswers.length) : 1;
                  const questionRange = {
                    start: nextQuestionNumber,
                    end: nextQuestionNumber + slotCount - 1,
                  };
                  nextQuestionNumber = questionRange.end + 1;
  
                  newQuestions.push({
                    id: existingQuestion?.id ?? createDraftId("draft-q"),
                    label: formatQuestionRange(questionRange),
                    prompt,
                    acceptedAnswers,
                    explanation: existingQuestion?.explanation ?? "",
                    variants,
                  });
                });
              }
  
              newGroup.questions = newQuestions;
              newGroup.questionEnd = newGroup.questionStart + Math.max(0, totalQuestionSlots({ ...newGroup, questions: newQuestions }) - 1);
            }
  
            return newGroup;
          });
  
        if (updates.sectionId) {
          nextGroups = reorderQuestionGroupsForDrop(
            nextGroups,
            current.content.sections,
            groupId,
            updates.sectionId,
            null,
          );
        }
  
        return {
          ...current,
          questionGroups: isStructuralGroupUpdate(updates)
            ? normalizeQuestionGroups(
                nextGroups,
                current.metadata.type,
                current.metadata.format,
                current.content.sections,
              )
            : nextGroups,
        };
      });
    };

  const removeGroup = (groupId: string) => {
      setDraft((current) => ({
        ...current,
        questionGroups: normalizeQuestionGroups(
          (current.questionGroups ?? []).filter((g) => g.id !== groupId),
          current.metadata.type,
          current.metadata.format,
          current.content.sections,
        )
      }));
    };

  const updateQuestion = (groupId: string, questionId: string, updates: Partial<AdminTestDraftQuestion>) => {
      setDraft((current) => ({
        ...current,
        questionGroups: normalizeQuestionGroups((current.questionGroups ?? []).map((g) => {
          if (g.id !== groupId) return g;
          return {
            ...g,
            questions: g.questions.map((q) => q.id === questionId ? { ...q, ...updates } : q)
          };
        }), current.metadata.type, current.metadata.format, current.content.sections)
      }));
    };

  return { handleDiagramImageUpload, handleDiagramImagePaste, pasteDiagramImageFromClipboard, updateGroup, removeGroup, updateQuestion };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
