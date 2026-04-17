import { create } from "zustand";

export interface AuthSessionState {
  userId: string | null;
  name: string;
  isPremium: boolean;
  isAuthenticated: boolean;
  setSession: (session: { userId: string; name: string; isPremium: boolean }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthSessionState>((set) => ({
  userId: null,
  name: "Guest",
  isPremium: false,
  isAuthenticated: false,
  setSession: ({ userId, name, isPremium }) =>
    set({
      userId,
      name,
      isPremium,
      isAuthenticated: true
    }),
  clearSession: () =>
    set({
      userId: null,
      name: "Guest",
      isPremium: false,
      isAuthenticated: false
    })
}));
