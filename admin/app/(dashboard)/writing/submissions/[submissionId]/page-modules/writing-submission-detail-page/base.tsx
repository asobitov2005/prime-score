"use client";

export function useBaseScope(props: { params: { submissionId: string } }) {
  const { params } = props;
    return { params };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
