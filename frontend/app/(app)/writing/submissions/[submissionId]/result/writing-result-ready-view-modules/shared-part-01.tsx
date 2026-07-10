"use client";

import { WritingResultClientState } from "./dependencies";



export type WritingResultReadyScope = WritingResultClientState & {
  result: NonNullable<WritingResultClientState["result"]>;
};
