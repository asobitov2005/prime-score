import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  clearBrowserSessionCookies,
  readBrowserSessionCookies,
  syncBrowserSessionCookies,
} from "@/lib/user-session-cookies";

export interface AuthSessionState {
  userId: string | null;
  sessionId: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  name: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  isPremium: boolean;
  premiumUntil: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  setSession: (session: { userId: string; sessionId: string; accessToken?: string | null; refreshToken?: string | null; name: string; phoneNumber: string | null; avatarUrl?: string | null; isPremium: boolean; premiumUntil?: string | null }) => void;
  syncSession: (session: Partial<{ userId: string | null; sessionId: string | null; accessToken: string | null; refreshToken: string | null; name: string; phoneNumber: string | null; avatarUrl: string | null; isPremium: boolean; premiumUntil: string | null }>) => void;
  setTokens: (tokens: { accessToken?: string | null; refreshToken?: string | null }) => void;
  updateName: (newName: string) => void;
  updateAvatar: (avatarUrl: string | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthSessionState>()(
  persist(
    (set) => ({
      userId: null,
      sessionId: null,
      accessToken: null,
      refreshToken: null,
      name: "Guest",
      phoneNumber: null,
      avatarUrl: null,
      isPremium: false,
      premiumUntil: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (hasHydrated) =>
        set({
          hasHydrated
        }),
      setSession: ({ userId, sessionId, accessToken = null, refreshToken = null, name, phoneNumber, avatarUrl = null, isPremium, premiumUntil = null }) =>
        set(() => {
          syncBrowserSessionCookies({ sessionId, accessToken, refreshToken });
          return {
            userId,
            sessionId,
            accessToken,
            refreshToken,
            name,
            phoneNumber,
            avatarUrl,
            isPremium,
            premiumUntil,
            isAuthenticated: true
          };
        }),
      syncSession: (session) =>
        set((state) => ({
          userId: session.userId ?? state.userId,
          sessionId: session.sessionId ?? state.sessionId,
          accessToken: session.accessToken === undefined ? state.accessToken : session.accessToken,
          refreshToken: session.refreshToken === undefined ? state.refreshToken : session.refreshToken,
          name: session.name ?? state.name,
          phoneNumber: session.phoneNumber === undefined ? state.phoneNumber : session.phoneNumber,
          avatarUrl: session.avatarUrl === undefined ? state.avatarUrl : session.avatarUrl,
          isPremium: session.isPremium ?? state.isPremium,
          premiumUntil: session.premiumUntil === undefined ? state.premiumUntil : session.premiumUntil,
          isAuthenticated:
            state.isAuthenticated
            || Boolean(session.userId ?? state.userId)
            || Boolean(session.sessionId ?? state.sessionId)
            || Boolean(session.accessToken ?? state.accessToken),
        })),
      setTokens: ({ accessToken, refreshToken }) =>
        set((state) => {
          const nextAccessToken = accessToken === undefined ? state.accessToken : accessToken;
          const nextRefreshToken = refreshToken === undefined ? state.refreshToken : refreshToken;
          syncBrowserSessionCookies({
            sessionId: state.sessionId,
            accessToken: nextAccessToken,
            refreshToken: nextRefreshToken,
          });
          return {
            accessToken: nextAccessToken,
            refreshToken: nextRefreshToken,
          };
        }),
      updateName: (newName) =>
        set(() => ({
          name: newName
        })),
      updateAvatar: (avatarUrl) =>
        set(() => ({
          avatarUrl
        })),
      clearSession: () =>
        set(() => {
          clearBrowserSessionCookies();
          return {
            userId: null,
            sessionId: null,
            accessToken: null,
            refreshToken: null,
            name: "Guest",
            phoneNumber: null,
            avatarUrl: null,
            isPremium: false,
            premiumUntil: null,
            isAuthenticated: false
          };
        })
    }),
    {
      name: "prime-auth-storage",
      partialize: (state) => ({
        userId: state.userId,
        sessionId: state.sessionId,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        name: state.name,
        phoneNumber: state.phoneNumber,
        avatarUrl: state.avatarUrl,
        isPremium: state.isPremium,
        premiumUntil: state.premiumUntil,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const cookieSession = readBrowserSessionCookies();
          if ((!state.accessToken || !state.refreshToken || !state.sessionId) && (cookieSession.accessToken || cookieSession.refreshToken || cookieSession.sessionId)) {
            state.syncSession({
              accessToken: cookieSession.accessToken,
              refreshToken: cookieSession.refreshToken,
              sessionId: cookieSession.sessionId,
              userId: state.userId,
            });
          } else if (state.accessToken || state.refreshToken || state.sessionId) {
            syncBrowserSessionCookies({
              sessionId: state.sessionId,
              accessToken: state.accessToken,
              refreshToken: state.refreshToken,
            });
          }
          state.setHasHydrated(true);
        }
      }
    }
  )
);
