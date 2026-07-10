"use client";

import { Loader2, ReactNode, cn } from "./part-1-live-view-dependencies";
import { radialBarHeights } from "./part-1-live-view-part-01";

export function Part1LiveLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#E5E7EB] bg-white py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
      <p className="mt-4 text-sm font-medium text-[#64748B]">Connecting to examiner...</p>
    </div>
  );
}

export function AiExaminerVisual({ speaking, active }: { speaking: boolean; active: boolean }) {
  const cx = 90;
  const cy = 90;
  const innerRadius = 54;

  return (
    <div className="relative mt-3 flex h-[140px] w-[140px] items-center justify-center overflow-hidden">
      {speaking ? (
        <>
          <span className="part1-ai-ring part1-ai-ring-active" />
          <span className="part1-ai-ring part1-ai-ring-active part1-ai-ring-delay" />
        </>
      ) : null}

      <svg viewBox="0 0 180 180" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="part1PurpleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        {radialBarHeights.map((baseHeight, index) => {
          const angle = (index / radialBarHeights.length) * 360 - 90;
          const radians = (angle * Math.PI) / 180;
          const length = speaking ? baseHeight : active ? baseHeight * 0.55 : baseHeight * 0.28;
          const x1 = cx + Math.cos(radians) * innerRadius;
          const y1 = cy + Math.sin(radians) * innerRadius;
          const x2 = cx + Math.cos(radians) * (innerRadius + length);
          const y2 = cy + Math.sin(radians) * (innerRadius + length);

          return (
            <line
              key={index}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="url(#part1PurpleGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity={speaking ? 0.9 : active ? 0.45 : 0.2}
              className={speaking ? "part1-radial-bar" : undefined}
              style={speaking ? { animationDelay: `${index * 45}ms` } : undefined}
            />
          );
        })}
      </svg>

      <div
        className={cn(
          "relative z-10 h-[78px] w-[78px] overflow-hidden rounded-full bg-gradient-to-br from-[#DDD6FE] via-[#7C3AED] to-[#5B21B6] shadow-[0_0_32px_rgba(124,58,237,0.35)] transition-transform duration-500",
          speaking && "scale-[1.03]",
        )}
      >
        <div className="absolute inset-[18%] rounded-full bg-gradient-to-br from-white/45 to-transparent" />
        <div className="absolute inset-[38%] rounded-full bg-white/20 blur-[1px]" />
      </div>
    </div>
  );
}

export function StatusPill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#E5E7EB] bg-white px-3 text-xs font-semibold text-[#0F172A] sm:text-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SidebarCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-[#E5E7EB] bg-white p-3.5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.12)]",
        className,
      )}
    >
      <p className="text-xs font-semibold text-[#64748B] sm:text-sm">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function StatusRow({
  icon,
  label,
  healthy,
}: {
  icon: ReactNode;
  label: string;
  healthy: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", healthy ? "bg-[#ECFDF5]" : "bg-[#F8FAFC]")}>
        {icon}
      </span>
      <span className={cn("text-xs font-semibold sm:text-sm", healthy ? "text-[#0F172A]" : "text-[#64748B]")}>{label}</span>
    </div>
  );
}

export function ExamWaveform({
  bars,
  color,
  active,
  className,
  compact = false,
}: {
  bars: readonly number[];
  color: "purple" | "green";
  active: boolean;
  className?: string;
  compact?: boolean;
}) {
  const barClassName =
    color === "purple"
      ? "bg-gradient-to-t from-[#6D28D9] via-[#8B5CF6] to-[#DDD6FE]"
      : "bg-gradient-to-t from-[#059669] via-[#10B981] to-[#6EE7B7]";
  const lineClassName = color === "purple" ? "bg-[#DDD6FE]" : "bg-[#A7F3D0]";

  return (
    <div className={cn("relative flex w-full items-center justify-center px-2", compact ? "h-9" : "h-11", className)}>
      <span className={cn("absolute inset-x-0 top-1/2 h-px -translate-y-1/2", lineClassName)} />
      <div className="relative flex w-full items-center justify-between gap-[3px]">
        {bars.map((height, index) => (
          <span
            key={`${height}-${index}`}
            className={cn("w-[3px] rounded-full transition-[height,opacity] duration-200", barClassName)}
            style={{
              height: active ? height : Math.max(5, Math.round(height * 0.28)),
              opacity: active ? (index < 2 || index > bars.length - 3 ? 0.5 : 0.95) : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function buildDisplayBars(source: readonly number[], inputLevel: number): number[] {
  const level = Math.max(0, Math.min(1, inputLevel * 18));
  return source.map((height, index) => {
    const wave = Math.sin((index / source.length) * Math.PI * 2 + level * 4) * 0.18;
    return Math.max(6, Math.round(height * (0.34 + level * 0.66 + wave)));
  });
}

export function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
