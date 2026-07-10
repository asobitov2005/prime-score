import { aiApi } from "@/lib/api/ai";
import { paymentsApi } from "@/lib/api/payments";
import { testsApi } from "@/lib/api/tests";
import { transcriptApi } from "@/lib/api/transcript";
import { writingApi } from "@/lib/api/writing";

/**
 * Backward-compatible admin API facade.
 *
 * Domain implementations live in `lib/api/*` while existing callers can keep
 * importing the single `adminApi` object from this module.
 */
export const adminApi = {
  ...testsApi,
  ...transcriptApi,
  ...aiApi,
  ...writingApi,
  ...paymentsApi,
};
