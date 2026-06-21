"use client";

import { cn } from "@/lib/utils";

export type SpeakingSphereState = "connecting" | "idle" | "speaking" | "listening";

type SpeakingAiSphereProps = {
  state: SpeakingSphereState;
  inputLevel?: number;
  size?: "md" | "lg";
  onDoubleActivate?: () => void;
  className?: string;
};

export function SpeakingAiSphere({
  state,
  inputLevel = 0,
  size = "lg",
  onDoubleActivate,
  className,
}: SpeakingAiSphereProps) {
  const dimension = size === "lg" ? "min(72vw, 280px)" : "min(56vw, 220px)";
  const level = Math.max(0, Math.min(1, inputLevel));
  const pulseScale = 1 + level * 0.14;
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";
  const isConnecting = state === "connecting";

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        isSpeaking && "speaking-ai-sphere-active-speaking",
        isListening && "speaking-ai-sphere-active-listening",
        className,
      )}
      style={{ width: dimension, height: dimension }}
      onDoubleClick={onDoubleActivate}
      role={onDoubleActivate ? "button" : undefined}
      aria-label={onDoubleActivate ? "Double tap to finish session" : undefined}
      tabIndex={onDoubleActivate ? 0 : undefined}
      onKeyDown={onDoubleActivate ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onDoubleActivate();
        }
      } : undefined}
    >
      <div
        className={cn(
          "speaking-ai-sphere-halo pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500",
          isSpeaking && "speaking-ai-sphere-halo-speaking",
          isListening && "speaking-ai-sphere-halo-listening",
          isConnecting && "speaking-ai-sphere-halo-connecting",
          !isSpeaking && !isListening && !isConnecting && "opacity-70",
        )}
        style={{ transform: `scale(${1.05 + level * 0.12})` }}
      />

      {(isSpeaking || isListening) && (
        <>
          <span className="speaking-ai-sphere-ring speaking-ai-sphere-ring-1 pointer-events-none absolute inset-0 rounded-full" />
          <span className="speaking-ai-sphere-ring speaking-ai-sphere-ring-2 pointer-events-none absolute inset-0 rounded-full" />
        </>
      )}

      <div
        className={cn(
          "speaking-ai-sphere-shell relative overflow-hidden rounded-full shadow-[0_40px_90px_-42px_rgba(255,69,0,0.75)] transition-transform duration-200",
          isSpeaking && "speaking-ai-sphere-shell-speaking",
          isListening && "speaking-ai-sphere-shell-listening",
          isConnecting && "speaking-ai-sphere-shell-connecting",
        )}
        style={{
          width: `calc(${dimension} * 0.78)`,
          height: `calc(${dimension} * 0.78)`,
          transform: `scale(${isListening ? pulseScale : isSpeaking ? 1.04 : 1})`,
        }}
      >
        <div className="speaking-ai-sphere-gradient absolute inset-[-20%] rounded-full" />
        <div className="speaking-ai-sphere-gradient-alt absolute inset-[-10%] rounded-full opacity-80 mix-blend-screen" />
        <div className="speaking-ai-sphere-highlight pointer-events-none absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.55),transparent_58%)]" />
        <div className="speaking-ai-sphere-core pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_50%_58%,rgba(20,8,4,0.35),transparent_62%)]" />
      </div>
    </div>
  );
}

export function speakingSphereStateFromLiveStatus(
  status: string,
  inputTurnOpen: boolean,
): SpeakingSphereState {
  if (status === "connecting" || status === "idle" || status === "ready") {
    return "connecting";
  }
  if (status === "listening" && inputTurnOpen) {
    return "listening";
  }
  if (status === "ai_speaking") {
    return "speaking";
  }
  if (status === "listening") {
    return "listening";
  }
  return "idle";
}
