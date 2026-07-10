"use client";
import type { PreviewMode, ReadingExamPreviewData } from "../shared";

export function useBaseScope(props: { mode: PreviewMode; data?: ReadingExamPreviewData }) {
  const { mode, data } = props;
    return { mode, data };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
