"use client";
import type { AdminTestDraftState } from "../dependencies";

export function useBaseScope(props: {
  draft: AdminTestDraftState;
  setDraft: React.Dispatch<React.SetStateAction<AdminTestDraftState>>;
}) {
  const {
    draft,
    setDraft
  } = props;
    return { draft, setDraft };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
