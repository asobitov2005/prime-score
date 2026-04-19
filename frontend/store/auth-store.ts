import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthSessionState {
  userId: string | null;
  sessionId: string | null;
  name: string;
  phoneNumber: string | null;
  isPremium: boolean;
  isAuthenticated: boolean;
  setSession: (session: { userId: string; sessionId: string; name: string; phoneNumber: string; isPremium: boolean }) => void;
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
      isAuthenticated: false,
      setSession: ({ userId, sessionId, name, phoneNumber, isPremium }) =>
        set({
          userId,
          sessionId,
          name,
          phoneNumber,
          isPremium,
          isAuthenticated: true
        }),
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
          isAuthenticated: false
        })
    }),
    {
      name: "prime-auth-storage"
    }
  )
);
