"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  Lightbulb,
  ListOrdered,
  MessageCircle,
  Mic2,
  RefreshCcw,
  Star,
  Target,
  Users,
  Volume2,
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { SpeakingSessionResult } from "@/lib/api/client";
import {
  bandProgressPercent,
  bandToCefr,
  formatResultDate,
  formatSpeakingBand,
  formatSpeakingDuration,
  formatSpeakingPartLabel,
  getScoreHeadline,
  getScoreSubtext,
  pickImprovementText,
  pickStrengthText,
  resolveSpeakingQuestionsAnswered,
} from "@/lib/speaking-result-utils";
import { roundIeltsBand } from "@/lib/ielts-band";
import { cn } from "@/lib/utils";

type SpeakingResultSummaryProps = {
  result: SpeakingSessionResult;
  repeatHref: string;
  detailHref: string;
  part?: number;
  topics?: string[];
  questionCount?: number;
};

const CRITERIA = [
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

export function SpeakingResultSummary({
  result,
  repeatHref,
  detailHref,
  part,
  topics = [],
  questionCount,
}: SpeakingResultSummaryProps) {
  const evaluation = result.evaluation;
  const overallBand = evaluation?.overallBand ?? null;
  const resolvedQuestionCount = questionCount ?? resolveSpeakingQuestionsAnswered(result);
  const topicLabel = topics.length ? topics.join(", ") : "AI-selected topic";
  const radarData = CRITERIA.map((item) => ({
    subject: item.shortLabel,
    score: roundIeltsBand(evaluation?.[item.bandKey]) ?? 0,
    fullMark: 9,
  }));

  return (
    <section className="speaking-result-summary grid gap-4 pb-1 lg:grid-cols-[minmax(0,1.48fr)_minmax(300px,1fr)] lg:gap-5">
      <article className="flex flex-col gap-3 rounded-[16px] border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_32px_-28px_rgba(15,23,42,0.16)] lg:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#10B981]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Test completed
            </span>
            <h1 className="mt-2 flex items-center gap-1.5 text-xl font-bold tracking-tight text-[#0F172A] lg:text-2xl">
              Great job!
              <Star className="h-5 w-5 fill-[#FBBF24] text-[#FBBF24]" />
            </h1>
            <p className="mt-0.5 text-sm text-[#64748B]">Here is your speaking test result.</p>
          </div>

          <div className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F8FAFC] text-[#64748B]">
              <Clock3 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-medium text-[#64748B]">Duration</p>
              <p className="text-sm font-bold text-[#0F172A]">{formatSpeakingDuration(result)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#E5E7EB] bg-[#FCFCFD] p-4 lg:p-5">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,176px)_minmax(0,1fr)] sm:items-center">
            <BandScoreRing band={overallBand} />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-[#0F172A] lg:text-2xl">{getScoreHeadline(overallBand)}</h2>
              <p className="mt-2 text-sm leading-6 text-[#64748B] lg:text-base lg:leading-7">{getScoreSubtext(overallBand)}</p>
              <span className="mt-3 inline-flex rounded-full bg-[#F3EFFF] px-3 py-1.5 text-xs font-semibold text-[#7C3AED] sm:text-sm">
                {bandToCefr(overallBand)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {CRITERIA.map((item) => {
            const Icon = item.icon;
            const band = evaluation?.[item.bandKey] ?? null;
            return (
              <CriterionCard
                key={item.key}
                icon={<Icon className={cn("h-3.5 w-3.5", item.iconClass)} />}
                iconBg={item.iconBg}
                label={item.shortLabel}
                score={formatSpeakingBand(band)}
                progress={bandProgressPercent(band)}
                barClass={item.barClass}
              />
            );
          })}
        </div>

        <div className="grid gap-2 rounded-[12px] border border-[#E5E7EB] bg-white sm:grid-cols-2 lg:grid-cols-4">
          <MetaCell icon={<Mic2 className="h-3.5 w-3.5 text-[#7C3AED]" />} label="Part" value={formatSpeakingPartLabel(result.entryMode, part)} />
          <MetaCell icon={<Users className="h-3.5 w-3.5 text-[#7C3AED]" />} label="Topics" value={topicLabel} />
          <MetaCell icon={<ListOrdered className="h-3.5 w-3.5 text-[#7C3AED]" />} label="Questions" value={String(resolvedQuestionCount)} />
          <MetaCell
            icon={<CalendarDays className="h-3.5 w-3.5 text-[#7C3AED]" />}
            label="Date"
            value={formatResultDate(result.gradedAt ?? result.endedAt ?? result.startedAt)}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={repeatHref}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-r from-[#6D4CFF] to-[#7C3AED] text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(109,76,255,0.75)] transition hover:brightness-105"
          >
            <RefreshCcw className="h-4 w-4" />
            Practice again
          </Link>
          <Link
            href={detailHref}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#E5E7EB] bg-white text-sm font-semibold text-[#0F172A] transition hover:bg-[#F8FAFC]"
          >
            View detailed feedback
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-[#F3EFFF] px-3 py-2.5 text-xs leading-5 text-[#7C3AED] sm:text-sm sm:leading-6">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Detailed feedback will help you improve faster.</span>
        </div>
      </article>

      <aside className="flex flex-col gap-4">
        <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_32px_-28px_rgba(15,23,42,0.16)] lg:p-5">
          <h2 className="text-base font-bold text-[#0F172A] lg:text-lg">Your band breakdown</h2>
          <p className="mt-1 text-xs text-[#64748B] sm:text-sm">Hover a point to see the band score.</p>
          <div className="mt-3 h-[240px] sm:h-[260px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart
                data={radarData}
                outerRadius="66%"
                margin={{ top: 16, right: 22, bottom: 16, left: 22 }}
              >
                <PolarGrid gridType="polygon" stroke="#E5E7EB" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#64748B", fontSize: 13, fontWeight: 600 }}
                />
                <PolarRadiusAxis angle={90} domain={[0, 9]} tick={false} axisLine={false} />
                <Radar
                  name="Band"
                  dataKey="score"
                  stroke="#7C3AED"
                  fill="#7C3AED"
                  fillOpacity={0.22}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#7C3AED", strokeWidth: 0 }}
                />
                <Tooltip
                  formatter={(value) => [formatSpeakingBand(Number(value)), "Band"]}
                  labelFormatter={(label) => String(label)}
                  contentStyle={{
                    border: "1px solid #E5E7EB",
                    borderRadius: 10,
                    fontSize: 13,
                    boxShadow: "0 12px 28px rgba(15,23,42,0.12)",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[16px] border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_32px_-28px_rgba(15,23,42,0.16)] lg:p-5">
          <FeedbackBlock
            icon={<CheckCircle2 className="h-4 w-4 text-[#10B981]" />}
            title="What went well"
            text={pickStrengthText(result)}
          />
          <div className="my-3 h-px bg-[#E5E7EB]" />
          <FeedbackBlock
            icon={<Lightbulb className="h-4 w-4 text-[#F97316]" />}
            title="To improve"
            text={pickImprovementText(result)}
          />
        </div>
      </aside>
    </section>
  );
}

function BandScoreRing({ band }: { band: number | null }) {
  const size = 176;
  const radius = 70;
  const stroke = 11;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = bandProgressPercent(band);
  const dashOffset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative mx-auto flex h-[176px] w-[176px] items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={normalizedRadius} fill="none" stroke="#EDE9FE" strokeWidth={stroke} />
        <circle
          cx={center}
          cy={center}
          r={normalizedRadius}
          fill="none"
          stroke="url(#speakingBandGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
        <defs>
          <linearGradient id="speakingBandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6D4CFF" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center text-center">
        <span className="text-[2.75rem] font-bold leading-none tracking-tight text-[#0F172A] lg:text-[3rem]">
          {formatSpeakingBand(band)}
        </span>
        <span className="mt-1.5 text-xs font-medium text-[#64748B] sm:text-sm">Overall Band</span>
      </div>
    </div>
  );
}

function CriterionCard({
  icon,
  iconBg,
  label,
  score,
  progress,
  barClass,
}: {
  icon: ReactNode;
  iconBg: string;
  label: string;
  score: string;
  progress: number;
  barClass: string;
}) {
  return (
    <div className="rounded-[12px] border border-[#E5E7EB] bg-white p-2.5 sm:p-3">
      <div className="flex items-center gap-2">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", iconBg)}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-tight text-[#64748B] sm:text-xs">{label}</p>
          <p className="text-lg font-bold leading-none text-[#0F172A] sm:text-xl">{score}</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E5E7EB]">
        <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function MetaCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-[10px] px-2.5 py-2.5 sm:px-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3EFFF] sm:h-8 sm:w-8">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-[#64748B] sm:text-[11px]">{label}</p>
        <p className="break-words text-xs font-bold leading-snug text-[#0F172A] sm:text-sm">{value}</p>
      </div>
    </div>
  );
}

function FeedbackBlock({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-[#0F172A]">{title}</h3>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-[#64748B] sm:text-sm sm:leading-6">{text}</p>
    </div>
  );
}
