"use client";

import { BookOpen, MessageCircle, SpeakingSessionResult, Target, Volume2 } from "./speaking-result-summary-dependencies";

export type SpeakingResultSummaryProps = {
  result: SpeakingSessionResult;
  repeatHref: string;
  detailHref: string;
  part?: number;
  topics?: string[];
  questionCount?: number;
};

export const CRITERIA = [
  {
    key: "fluency",
    label: "Fluency",
    shortLabel: "Fluency",
    bandKey: "fluencyBand" as const,
    icon: MessageCircle,
    iconClass: "text-[#7C3AED]",
    iconBg: "bg-[#F3EFFF]",
    barClass: "bg-[#7C3AED]",
  },
  {
    key: "lexical",
    label: "Lexical Resource",
    shortLabel: "Lexical",
    bandKey: "lexicalBand" as const,
    icon: Target,
    iconClass: "text-[#10B981]",
    iconBg: "bg-[#ECFDF5]",
    barClass: "bg-[#10B981]",
  },
  {
    key: "grammar",
    label: "Grammatical Range",
    shortLabel: "Grammar",
    bandKey: "grammarBand" as const,
    icon: BookOpen,
    iconClass: "text-[#2563EB]",
    iconBg: "bg-[#EFF6FF]",
    barClass: "bg-[#2563EB]",
  },
  {
    key: "pronunciation",
    label: "Pronunciation",
    shortLabel: "Pronunciation",
    bandKey: "pronunciationBand" as const,
    icon: Volume2,
    iconClass: "text-[#F97316]",
    iconBg: "bg-[#FFF7ED]",
    barClass: "bg-[#F97316]",
  },
] as const;
