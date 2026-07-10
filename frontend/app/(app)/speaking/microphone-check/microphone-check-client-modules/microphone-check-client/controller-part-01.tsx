"use client";
import type { BaseScope } from "./base";
import { createApiClient, useCallback, useEffect, useMemo, useRef, useRouter, useSearchParams, useState } from "../dependencies";
import { ConnectionState, MicPermissionState, MicState, QualityState, buildWaveformBars, emptyBars, normalizeAiMode, normalizeSpeakingEntryMode, permissionStateFromMediaError } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const router = useRouter();

  const searchParams = useSearchParams();

  const api = useMemo(() => createApiClient(), []);

  const [micState, setMicState] = useState<MicState>("checking");

  const [permissionState, setPermissionState] = useState<MicPermissionState>("unknown");

  const [quality, setQuality] = useState<QualityState>("listening");

  const [connection, setConnection] = useState<ConnectionState>("stable");

  const [inputLevel, setInputLevel] = useState(0);

  const [bars, setBars] = useState<number[]>(() => [...emptyBars]);

  const [speakingTestId, setSpeakingTestId] = useState<string | null>(() => searchParams.get("testId"));

  const [isStarting, setIsStarting] = useState(false);

  const [startError, setStartError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  const rafRef = useRef<number | null>(null);

  const smoothedLevelRef = useRef(0);

  const qualityRef = useRef<QualityState>("listening");

  const pendingQualityRef = useRef<{ value: QualityState; since: number } | null>(null);

  const entryMode = normalizeSpeakingEntryMode(searchParams.get("mode"));

  const aiMode = normalizeAiMode(searchParams.get("aiMode"));

  const requestedPart = entryMode === "full" ? 1 : Number(entryMode.replace("part_", ""));

  useEffect(() => {
      const previousBodyOverflowY = document.body.style.overflowY;
      const previousHtmlOverflowY = document.documentElement.style.overflowY;
  
      document.body.style.overflowY = "hidden";
      document.documentElement.style.overflowY = "hidden";
  
      return () => {
        document.body.style.overflowY = previousBodyOverflowY;
        document.documentElement.style.overflowY = previousHtmlOverflowY;
      };
    }, []);

  const stopMic = useCallback(() => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      void audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
    }, []);

  const updateStableQuality = useCallback((nextQuality: QualityState) => {
      const currentQuality = qualityRef.current;
      const now = performance.now();
      const settleMs = nextQuality === "clipping" ? 450 : 750;
  
      if (nextQuality === currentQuality) {
        pendingQualityRef.current = null;
        return;
      }
  
      const pending = pendingQualityRef.current;
      if (!pending || pending.value !== nextQuality) {
        pendingQualityRef.current = { value: nextQuality, since: now };
        return;
      }
  
      if (now - pending.since >= settleMs) {
        qualityRef.current = nextQuality;
        pendingQualityRef.current = null;
        setQuality(nextQuality);
      }
    }, []);

  const startMic = useCallback(async () => {
      stopMic();
  
      if (!navigator.mediaDevices?.getUserMedia) {
        setMicState("unsupported");
        setQuality("low");
        qualityRef.current = "low";
        pendingQualityRef.current = null;
        smoothedLevelRef.current = 0;
        setInputLevel(0);
        setBars([...emptyBars]);
        return;
      }
  
      setMicState("checking");
      setQuality("listening");
      qualityRef.current = "listening";
      pendingQualityRef.current = null;
      smoothedLevelRef.current = 0;
      setInputLevel(0);
      setBars([...emptyBars]);
  
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
          throw new Error("AudioContext is not available.");
        }
  
        const audioContext = new AudioContextCtor();
        if (audioContext.state === "suspended") {
          await audioContext.resume().catch(() => undefined);
        }
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.48;
        audioContext.createMediaStreamSource(stream).connect(analyser);
  
        streamRef.current = stream;
        audioContextRef.current = audioContext;
        setPermissionState("granted");
        setMicState("connected");
  
        const track = stream.getAudioTracks()[0];
        if (track) {
          track.onended = () => {
            setMicState("blocked");
            setQuality("low");
            qualityRef.current = "low";
            pendingQualityRef.current = null;
            smoothedLevelRef.current = 0;
            setInputLevel(0);
            setBars([...emptyBars]);
          };
        }
  
        const samples = new Uint8Array(analyser.fftSize);
        const animate = () => {
          analyser.getByteTimeDomainData(samples);
          let totalSquares = 0;
          let peak = 0;
          for (let index = 0; index < samples.length; index += 1) {
            const value = Math.abs((samples[index] - 128) / 128);
            totalSquares += value * value;
            peak = Math.max(peak, value);
          }
  
          const rms = Math.sqrt(totalSquares / samples.length);
          const rawLevel = Math.min(1, Math.max(0, rms * 7.8 + peak * 0.48));
          const previousLevel = smoothedLevelRef.current;
          const smoothingFactor = rawLevel > previousLevel ? 0.36 : 0.16;
          const level = previousLevel + (rawLevel - previousLevel) * smoothingFactor;
          smoothedLevelRef.current = level;
          setInputLevel(level);
          updateStableQuality(peak > 0.98 ? "clipping" : level > 0.22 ? "good" : level > 0.035 ? "listening" : "low");
          setBars(buildWaveformBars(samples, level));
  
          rafRef.current = requestAnimationFrame(animate);
        };
  
        animate();
      } catch (error) {
        setMicState("blocked");
        setPermissionState(permissionStateFromMediaError(error));
        setQuality("low");
        qualityRef.current = "low";
        pendingQualityRef.current = null;
        smoothedLevelRef.current = 0;
        setInputLevel(0);
        setBars([...emptyBars]);
      }
  	  }, [stopMic, updateStableQuality]);

  useEffect(() => {
      if (speakingTestId) {
        return;
      }
  
      let cancelled = false;
      api.listSpeakingTests()
        .then((payload) => {
          if (!cancelled) {
            setSpeakingTestId(payload.items[0]?.id ?? null);
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setStartError(error instanceof Error ? error.message : "Could not load speaking tests.");
          }
        });
  
      return () => {
        cancelled = true;
      };
    }, [api, speakingTestId]);

  return { router, searchParams, api, micState, setMicState, permissionState, setPermissionState, quality, setQuality, connection, setConnection, inputLevel, setInputLevel, bars, setBars, speakingTestId, setSpeakingTestId, isStarting, setIsStarting, startError, setStartError, streamRef, audioContextRef, rafRef, smoothedLevelRef, qualityRef, pendingQualityRef, entryMode, aiMode, requestedPart, stopMic, updateStableQuality, startMic };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
