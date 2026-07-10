"use client";

import { SpeakingAiMode, SpeakingEntryMode } from "./dependencies";

import { LiveStatus } from "./shared-part-01";



export function compactLiveTranscript(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) {
    return "";
  }
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
  if (sentences.length <= 2) {
    return sentences.join(" ");
  }
  return sentences.slice(-2).join(" ");
}

export function calculateInputLevel(samples: Float32Array): number {
  let totalSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    totalSquares += samples[index] * samples[index];
  }
  return Math.min(1, Math.sqrt(totalSquares / Math.max(1, samples.length)) * 6);
}

export function resampleFloat32(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) {
    return input;
  }
  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);
  if (ratio > 1) {
    // Downsampling (e.g. 48kHz -> 16kHz): average each window of input samples so
    // high-frequency content is low-passed instead of point-sampled. Plain decimation
    // aliases speech harmonics into the voice band and degrades transcription quality.
    for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
      const start = Math.floor(outputIndex * ratio);
      const end = Math.min(input.length, Math.floor((outputIndex + 1) * ratio));
      let sum = 0;
      let count = 0;
      for (let i = start; i < end; i += 1) {
        sum += input[i];
        count += 1;
      }
      output[outputIndex] = count > 0 ? sum / count : input[Math.min(input.length - 1, start)];
    }
    return output;
  }
  for (let outputIndex = 0; outputIndex < outputLength; outputIndex += 1) {
    const inputIndex = outputIndex * ratio;
    const leftIndex = Math.floor(inputIndex);
    const rightIndex = Math.min(input.length - 1, leftIndex + 1);
    const fraction = inputIndex - leftIndex;
    output[outputIndex] = input[leftIndex] + (input[rightIndex] - input[leftIndex]) * fraction;
  }
  return output;
}

export function floatToPcm16Bytes(samples: Float32Array): Uint8Array {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToUint8Array(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function parseAudioSampleRate(mimeType: string): number {
  const match = /rate=(\d+)/i.exec(mimeType);
  return match ? Number(match[1]) || 24000 : 24000;
}

export function buildRepeatSpeakingHref(
  testId: string,
  entryMode: SpeakingEntryMode,
  aiMode: SpeakingAiMode,
  part: number,
  topics: string[],
  randomTopic: boolean,
): string {
  const params = new URLSearchParams({
    mode: entryMode,
    aiMode,
    part: String(part),
    testId,
    randomTopic: randomTopic ? "1" : "0",
  });
  topics.forEach((topic) => params.append("topics", topic));
  return `/speaking/microphone-check?${params.toString()}`;
}

export function normalizeAiMode(value: string | null): SpeakingAiMode {
  if (value === "free_talk" || value === "uzbek_roast") {
    return value;
  }
  if (value === "practice") return "free_talk";
  if (value === "strict_roast") return "uzbek_roast";
  return "strict_exam";
}

export function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatBand(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-";
  }
  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

export function liveStatusLabel(status: LiveStatus): string {
  if (status === "connecting") return "Connecting";
  if (status === "ready") return "Ready";
  if (status === "listening") return "Listening";
  if (status === "ai_speaking") return "AI speaking";
  if (status === "finalizing") return "Preparing feedback";
  if (status === "closed") return "Ended";
  if (status === "error") return "Error";
  return "Starting";
}

export function buildDisplayBars(baseBars: readonly number[], inputLevel: number): number[] {
  const lift = Math.pow(Math.min(1, inputLevel * 1.4), 0.75);
  return baseBars.map((height, index) => {
    const pulse = 0.72 + ((index % 7) / 14);
    return Math.max(6, Math.round(height * (0.34 + lift * pulse)));
  });
}
