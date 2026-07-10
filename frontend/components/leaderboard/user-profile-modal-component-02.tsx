"use client";

import { React } from "./user-profile-modal-dependencies";
import { Rarity } from "./user-profile-modal-component-01";

export type UserProfileModalData = {
  avatarUrl?: string;
  username: string;
  level: number;
  totalXp: number;
  rank: number;
  isOnline?: boolean;
  isPremium?: boolean;
  equippedBadge: {
    image?: string;
    icon?: React.ReactNode;
    title: string;
    tagline: string;
    rarity: Rarity;
  };
  activeTitles: string[];
  stats: {
    longestStreak: number;
    highestBand: number;
    totalMockTests: number;
    totalStudyHours: number;
    accuracy: number;
    achievementsUnlocked: number;
  };
  achievements: {
    id: string;
    image?: string;
    icon?: React.ReactNode;
    title: string;
    rarity: Rarity;
  }[];
};
