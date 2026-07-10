"use client";

import { NORMAL_NO_ANSWER_MS, PART_TWO_PREP_NO_ANSWER_MS, SPEECH_END_SILENCE_MS, SPEECH_LEVEL_THRESHOLD, SPEECH_SILENCE_LEVEL } from "./shared-part-01";

import { LiveAudioRuntime, LiveOutputRuntime, getAudioContextConstructor } from "./shared-part-05";

import { base64ToUint8Array, bytesToBase64, calculateInputLevel, floatToPcm16Bytes, parseAudioSampleRate, resampleFloat32 } from "./shared-part-07";



export function startOutputRuntime(): LiveOutputRuntime {
  const AudioContextCtor = getAudioContextConstructor();
  // Gemini Live streams 24kHz PCM. Pin the context rate to match so playback math
  // and buffering stay correct instead of depending on the device's native rate.
  let outputContext: AudioContext;
  try {
    outputContext = new AudioContextCtor({ sampleRate: 24000 });
  } catch {
    outputContext = new AudioContextCtor();
  }
  void outputContext.resume().catch(() => undefined);
  return {
    outputContext,
    nextPlaybackAt: 0,
  };
}

export async function startAudioRuntime(
  getSocket: () => WebSocket | null,
  onInputLevel: (value: number) => void,
  shouldStreamInput: () => boolean,
  turnHandlers: {
    onSpeechStart?: () => void;
    onSilenceTurnEnd?: () => void;
    silenceEndMs?: number;
    minSpeechMsBeforeSilenceEnd?: number;
  } = {},
  shouldKeepRuntime: () => boolean = () => true,
): Promise<LiveAudioRuntime> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone access is not supported by this browser.");
  }
  const AudioContextCtor = getAudioContextConstructor();

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      // Auto gain control dynamically normalizes loudness, which keeps the input
      // level above SPEECH_SILENCE_LEVEL during pauses and prevents the client-side
      // end-of-turn detection from firing. Keep it off so the fixed VAD thresholds
      // stay meaningful (the server now relies on the client to mark turn ends).
      autoGainControl: false,
      channelCount: 1,
    },
  });
  if (!shouldKeepRuntime()) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("Microphone start was cancelled.");
  }
  const inputContext = new AudioContextCtor();
  await inputContext.resume().catch(() => undefined);
  if (!shouldKeepRuntime()) {
    stream.getTracks().forEach((track) => track.stop());
    void inputContext.close().catch(() => undefined);
    throw new Error("Microphone start was cancelled.");
  }

  const source = inputContext.createMediaStreamSource(stream);
  const processor = inputContext.createScriptProcessor(4096, 1, 1);
  const silentGain = inputContext.createGain();
  silentGain.gain.value = 0;
  source.connect(processor);
  processor.connect(silentGain);
  silentGain.connect(inputContext.destination);

  let wasStreaming = false;
  let hasSpeechInTurn = false;
  let lastSpeechAt = 0;
  let speechStartedAt = 0;
  const silenceEndMs = turnHandlers.silenceEndMs ?? SPEECH_END_SILENCE_MS;
  const minSpeechMsBeforeSilenceEnd = turnHandlers.minSpeechMsBeforeSilenceEnd ?? 0;

  processor.onaudioprocess = (event) => {
    const socket = getSocket();
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    const input = event.inputBuffer.getChannelData(0);
    const level = calculateInputLevel(input);
    onInputLevel(level);
    const canStream = shouldStreamInput();
    if (!canStream) {
      wasStreaming = false;
      hasSpeechInTurn = false;
      lastSpeechAt = 0;
      return;
    }
    if (!wasStreaming) {
      wasStreaming = true;
      hasSpeechInTurn = false;
      lastSpeechAt = 0;
    }
    const now = performance.now();
    if (level >= SPEECH_LEVEL_THRESHOLD) {
      if (!hasSpeechInTurn) {
        speechStartedAt = now;
        turnHandlers.onSpeechStart?.();
      }
      hasSpeechInTurn = true;
      lastSpeechAt = now;
    }
    if (
      hasSpeechInTurn
      && turnHandlers.onSilenceTurnEnd
      && level <= SPEECH_SILENCE_LEVEL
      && now - lastSpeechAt >= silenceEndMs
      && now - speechStartedAt >= minSpeechMsBeforeSilenceEnd
    ) {
      hasSpeechInTurn = false;
      wasStreaming = false;
      speechStartedAt = 0;
      turnHandlers.onSilenceTurnEnd();
      return;
    }
    const resampled = resampleFloat32(input, inputContext.sampleRate, 16000);
    if (resampled.length === 0) {
      return;
    }
    socket.send(JSON.stringify({
      type: "audio",
      data: bytesToBase64(floatToPcm16Bytes(resampled)),
    }));
  };

  return {
    inputContext,
    stream,
    source,
    processor,
    silentGain,
  };
}

export function stopAudioRuntime(runtime: LiveAudioRuntime | null) {
  if (!runtime) {
    return;
  }
  runtime.processor.onaudioprocess = null;
  runtime.source.disconnect();
  runtime.processor.disconnect();
  runtime.silentGain.disconnect();
  runtime.stream.getTracks().forEach((track) => track.stop());
  void runtime.inputContext.close().catch(() => undefined);
}

export function stopOutputRuntime(runtime: LiveOutputRuntime | null) {
  if (!runtime) {
    return;
  }
  void runtime.outputContext.close().catch(() => undefined);
}

export function getNoAnswerDelayMs(examinerText: string): number {
  return isPartTwoPreparationPrompt(examinerText) ? PART_TWO_PREP_NO_ANSWER_MS : NORMAL_NO_ANSWER_MS;
}

export function buildNoAnswerExaminerPrompt(examinerText: string): string {
  if (isPartTwoPreparationPrompt(examinerText)) {
    return "The candidate's preparation time is over. Please ask the candidate to begin their long turn now.";
  }
  return "The candidate has not answered. In a realistic IELTS examiner style, briefly prompt them once or repeat the question, then continue the test if they still do not answer.";
}

export function isPartTwoPreparationPrompt(value: string): boolean {
  return /part\s*2|cue card|one minute|prepare|preparation|pencil|paper|notes/i.test(value);
}

export async function playPcmAudio(base64Audio: string, mimeType: string, runtimeRef: React.MutableRefObject<LiveOutputRuntime | null>) {
  const runtime = runtimeRef.current;
  if (!runtime || !base64Audio) {
    return;
  }
  const bytes = base64ToUint8Array(base64Audio);
  if (bytes.length < 2) {
    return;
  }
  if (runtime.outputContext.state === "suspended") {
    await runtime.outputContext.resume().catch(() => undefined);
  }
  const sampleRate = parseAudioSampleRate(mimeType);
  const sampleCount = Math.floor(bytes.length / 2);
  const audioBuffer = runtime.outputContext.createBuffer(1, sampleCount, sampleRate);
  const channel = audioBuffer.getChannelData(0);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let index = 0; index < sampleCount; index += 1) {
    channel[index] = Math.max(-1, Math.min(1, view.getInt16(index * 2, true) / 32768));
  }
  const source = runtime.outputContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(runtime.outputContext.destination);
  const startAt = Math.max(runtime.outputContext.currentTime + 0.02, runtime.nextPlaybackAt);
  source.start(startAt);
  runtime.nextPlaybackAt = startAt + audioBuffer.duration;
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(fallbackTimer);
      resolve();
    };
    source.onended = finish;
    // Fallback measured from when this chunk actually *ends* (it may be queued behind
    // earlier audio), not from now. A timeout fired from "now" could resolve while the
    // examiner is still speaking and prematurely open the candidate's turn.
    const remainingMs = Math.max(0, (startAt + audioBuffer.duration - runtime.outputContext.currentTime) * 1000);
    const fallbackTimer = window.setTimeout(finish, Math.ceil(remainingMs) + 250);
  });
}

export function prefetchMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return;
  }
  void navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    })
    .catch(() => undefined);
}

export function parseLiveMessage(data: unknown): Record<string, string | number | boolean | null> | null {
  if (typeof data !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(data) as unknown;
    return parsed && typeof parsed === "object" ? parsed as Record<string, string | number | boolean | null> : null;
  } catch {
    return null;
  }
}

export function getLiveMessageString(message: Record<string, string | number | boolean | null>, key: string): string {
  const value = message[key];
  return typeof value === "string" ? value : "";
}

export function mergeTranscript(current: string, next: string): string {
  const cleanNext = next.trim();
  if (!cleanNext) {
    return current;
  }
  if (!current) {
    return cleanNext;
  }
  if (current.endsWith(cleanNext) || current.includes(cleanNext)) {
    return current;
  }
  return `${current} ${cleanNext}`.trim();
}
