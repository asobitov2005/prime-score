"use client";

export function useBaseScope(props: { params: { taskId: string } }) {
  const { params } = props;
    return { params };
}

export type BaseScope = ReturnType<typeof useBaseScope>;
