"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { ApiError, buildSpeakingLiveSessionHref, useCallback, useEffect } from "../dependencies";
import { normalizePermissionState } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { router, searchParams, api, micState, setPermissionState, connection, setConnection, speakingTestId, isStarting, setIsStarting, setStartError, entryMode, aiMode, requestedPart, stopMic, startMic } = scope;
  const handleStart = useCallback(async () => {
      if (!speakingTestId || micState !== "connected" || connection !== "stable" || isStarting) {
        return;
      }
  
      setIsStarting(true);
      setStartError(null);
      try {
        const session = await api.createSpeakingSession(speakingTestId, entryMode);
        stopMic();
        router.push(buildSpeakingLiveSessionHref(session, aiMode, requestedPart, searchParams));
      } catch (error) {
        const message = error instanceof ApiError || error instanceof Error
          ? error.message
          : "Could not start Speaking session.";
        setStartError(message);
        setIsStarting(false);
      }
    }, [aiMode, api, connection, entryMode, isStarting, micState, requestedPart, router, searchParams, speakingTestId, stopMic]);

  useEffect(() => {
      let permissionStatus: PermissionStatus | null = null;
      let isMounted = true;
  
      const syncPermission = async () => {
        if (!navigator.permissions?.query) {
          setPermissionState("unknown");
          return;
        }
        try {
          permissionStatus = await navigator.permissions.query({ name: "microphone" as PermissionName });
          if (!isMounted) return;
          setPermissionState(normalizePermissionState(permissionStatus.state));
          permissionStatus.onchange = () => {
            if (permissionStatus) {
              setPermissionState(normalizePermissionState(permissionStatus.state));
            }
          };
        } catch {
          setPermissionState("unknown");
        }
      };
  
      void syncPermission();
      void startMic();
  
      return () => {
        isMounted = false;
        if (permissionStatus) {
          permissionStatus.onchange = null;
        }
        stopMic();
      };
    }, [startMic, stopMic]);

  useEffect(() => {
      setConnection(navigator.onLine ? "stable" : "offline");
  
      const handleOnline = () => setConnection("stable");
      const handleOffline = () => setConnection("offline");
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
  
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }, []);

  return { handleStart };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
