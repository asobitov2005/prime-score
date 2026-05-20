import { AchievementsClient } from "@/src/components/achievements/AchievementsClient";
import { achievements } from "@/src/data/achievements";

export default function AchievementsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-500">
      <AchievementsClient achievements={achievements} />
    </div>
  );
}
