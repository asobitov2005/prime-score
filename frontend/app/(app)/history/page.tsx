import { getSubmittedAttempts } from "@/lib/server-me";
import { HistoryClient } from "./history-client";

export default async function HistoryPage() {
  const attempts = await getSubmittedAttempts();
  return <HistoryClient attempts={attempts} />;
}
