import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SpeakingPart2PreparationPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default function SpeakingPart2PreparationPage({ searchParams }: SpeakingPart2PreparationPageProps) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }
    if (value) {
      params.set(key, value);
    }
  });
  const suffix = params.toString();
  redirect(suffix ? `/speaking/part-2/live?${suffix}` : "/speaking/part-2/live");
}
