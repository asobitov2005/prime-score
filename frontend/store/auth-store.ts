import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthSessionState {
  userId: string | null;
  sessionId: string | null;
  name: string;
  phoneNumber: string | null;
  isPremium: boolean;
  premiumUntil: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
  setSession: (session: { userId: string; sessionId: string; name: string; phoneNumber: string; isPremium: boolean; premiumUntil?: string | null }) => void;
  syncSession: (session: Partial<{ userId: string; sessionId: string; name: string; phoneNumber: string | null; isPremium: boolean; premiumUntil: string | null }>) => void;
  updateName: (newName: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthSessionState>()(
  persist(
    (set) => ({
      userId: null,
      sessionId: null,
      name: "Guest",
      phoneNumber: null,
      isPremium: false,
      premiumUntil: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (hasHydrated) =>
        set({
          hasHydrated
        }),
      setSession: ({ userId, sessionId, name, phoneNumber, isPremium, premiumUntil = null }) =>
        set({
          userId,
          sessionId,
          name,
          phoneNumber,
          isPremium,
          premiumUntil,
          isAuthenticated: true
        }),
      syncSession: (session) =>
        set((state) => ({
          userId: session.userId ?? state.userId,
          sessionId: session.sessionId ?? state.sessionId,
          name: session.name ?? state.name,
          phoneNumber: session.phoneNumber === undefined ? state.phoneNumber : session.phoneNumber,
          isPremium: session.isPremium ?? state.isPremium,
          premiumUntil: session.premiumUntil === undefined ? state.premiumUntil : session.premiumUntil,
          isAuthenticated: state.isAuthenticated || Boolean(session.userId ?? state.userId),
        })),
      updateName: (newName) =>
        set((state) => ({
          name: newName
        })),
      clearSession: () =>
        set({
          userId: null,
          sessionId: null,
          name: "Guest",
          phoneNumber: null,
          isPremium: false,
          premiumUntil: null,
          isAuthenticated: false
        })
    }),
    {
      name: "prime-auth-storage",
      partialize: (state) => ({
        userId: state.userId,
        sessionId: state.sessionId,
        name: state.name,
        phoneNumber: state.phoneNumber,
        isPremium: state.isPremium,
        premiumUntil: state.premiumUntil,
        isAuthenticated: state.isAuthenticated
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      }
    }
  )
);
