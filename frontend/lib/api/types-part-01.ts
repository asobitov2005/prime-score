import { AccessType, AttemptMode, LeaderboardPeriod, TestScope, TestType } from "./types-dependencies";

export interface ApiListResponse<T> {
  data: T[];
  meta?: {
    total: number;
    page?: number;
    pageSize?: number;
  };
}

export interface AuthRequestCodeBody {
  telegramId: string;
}

export interface AuthVerifyCodeBody {
  telegramId: string;
  code: string;
}

export interface AuthTelegramWebAppBody {
  initData: string;
  requestContact?: boolean;
}

export interface AuthLoginResponse {
  session_id: string;
  access_token: string;
  refresh_token: string;
  access_expires_in_seconds: number;
  refresh_expires_in_seconds: number;
  user: {
    id: string;
    first_name: string;
    last_name?: string | null;
    username?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    is_premium: boolean;
    premium_until?: string | null;
    telegram_id?: number | null;
    created_at?: string | null;
  };
  is_new_user?: boolean;
  welcome_bonus_days?: number;
}

export interface TestListQuery {
  type?: TestType;
  access?: AccessType;
}

export interface StartAttemptBody {
  scope: TestScope;
  sectionId?: string;
  mode: AttemptMode;
}

export interface SaveAnswerBody {
  questionId: string;
  value: string | string[];
}

export interface LeaderboardQuery {
  type?: TestType | "combined";
  period?: LeaderboardPeriod;
}

export interface LeaderboardUserProfileResponse {
  user_id: string;
  avatar_url?: string | null;
  display_name: string;
  level: number;
  total_xp: number;
  rank: number;
  is_online: boolean;
  is_premium: boolean;
  current_streak: number;
  equipped_badge?: {
    title: string;
    rarity: string;
    tagline: string;
    image?: string | null;
  } | null;
  active_titles: string[];
  stats: {
    longest_streak: number;
    highest_band?: number | null;
    total_mock_tests: number;
    total_study_hours: number;
    accuracy?: number | null;
    achievements_unlocked: number;
  };
  achievements: Array<{
    id: string;
    title: string;
    rarity: string;
    image?: string | null;
  }>;
  achievement_catalog: Array<{
    id: string;
    title: string;
    description: string;
    category: "level" | "streak" | "skill" | "performance" | "special";
    skill_type?: "reading" | "listening" | "writing" | "speaking" | null;
    rarity: string;
    image?: string | null;
    status: "unlocked" | "in_progress" | "locked";
    requirement: string;
    required_xp?: number | null;
    unlock_level?: number | null;
    streak_days?: number | null;
    xp_reward?: number | null;
    unlocked_at?: string | null;
    progress?: {
      current: number;
      target: number;
      label: string;
    } | null;
  }>;
}

export interface SubscribeBody {
  planId: string;
  paymentMethod: "payme" | "click" | "uzum";
  promoCode?: string;
  isGift?: boolean;
}

export interface RedeemBody {
  code: string;
}

export interface GenerateGiftCodeBody {
  gift_days: number;
}

export interface RedeemResponse {
  message: string;
  code: string;
  plan_name: string;
  duration_days: number;
  is_premium: boolean;
  premium_until: string;
}

export interface GiftCodeSummaryItemResponse {
  gift_days: number;
  total_count: number;
  generated_count: number;
  available_count: number;
}

export interface GiftCodeRecordResponse {
  id: string;
  code: string;
  duration_days: number;
  status: "available" | "paused" | "redeemed" | "revoked" | "expired";
  expires_at?: string | null;
  redeemed_at?: string | null;
  created_at?: string | null;
}

export interface GiftCodeSummaryResponse {
  items: GiftCodeSummaryItemResponse[];
  recent_codes: GiftCodeRecordResponse[];
  total_available_count: number;
  can_generate: boolean;
}
