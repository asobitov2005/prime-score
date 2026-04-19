import type {
  AccessType,
  AttemptMode,
  LeaderboardPeriod,
  TestScope,
  TestType
} from "@/lib/types";

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

export interface SubscribeBody {
  planId: string;
  paymentMethod: "payme" | "click" | "uzum";
  promoCode?: string;
  isGift?: boolean;
}

export interface RedeemBody {
  code: string;
}

export interface AuthSessionRead {
  id: string;
  user_id: string;
  device_info: Record<string, string>;
  ip_address?: string;
  is_active: boolean;
  expires_at: string;
  last_used_at?: string;
}

export interface AuthSessionListResponse {
  items: AuthSessionRead[];
}
