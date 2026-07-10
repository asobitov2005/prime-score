"use client";
import type { ExamWritingTask, WritingTaskType } from "../shared";

export function useBaseScope(props: {
  task: ExamWritingTask | null;
  taskType: WritingTaskType;
  draftKey?: string | null;
}) {
  const {
    task,
    taskType,
    draftKey,
  } = props;
    return { task, taskType, draftKey };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
