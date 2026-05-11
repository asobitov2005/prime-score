import { getSubmittedAttempts } from "@/lib/server-me";
import { getWritingHistory } from "@/lib/server-writing";
import { HistoryClient } from "./history-client";

export default async function HistoryPage() {
  const [attempts, writingHistory] = await Promise.all([
    getSubmittedAttempts(),
    getWritingHistory().catch(() => ({ items: [], total: 0 })),
  ]);

  return <HistoryClient attempts={attempts} writingHistory={writingHistory.items} />;
}
