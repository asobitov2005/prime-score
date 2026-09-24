import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Clock3, Headphones, PenLine } from "lucide-react";
import { landingFont } from "@/components/marketing/landing-font";
import { ServerUserApiError, requestServerUserApi } from "@/lib/server-user-auth";
import { buildLoginHref } from "@/lib/subscription-navigation";
import { mockDuration, safeMockLaunch, type OnlineMockDetail } from "@/lib/mock-catalog";
import styles from "@/components/marketing/mock-sessions.module.css";

export const metadata = { title: "Full Mock", robots: { index: false, follow: false } };

export default async function OnlineMockPage({ params }: { params: { bundleId: string } }) {
  let mock: OnlineMockDetail;
  try {
    mock = await requestServerUserApi<OnlineMockDetail>(`/mock/online-mocks/${encodeURIComponent(params.bundleId)}`);
  } catch (error) {
    if (error instanceof ServerUserApiError && error.status === 401) redirect(buildLoginHref(`/mock/online/${params.bundleId}`));
    return <div className={`${landingFont.className} ${styles.screen}`}><Link href="/mock?mode=online">Back to Full Mock Tests</Link><div role="alert" className={styles.empty}>{error instanceof ServerUserApiError ? error.message : "This Full Mock is temporarily unavailable. Please try again."}</div></div>;
  }
  const labels = { listening: "Listening", reading: "Reading", writing_task_1: "Writing Task 1", writing_task_2: "Writing Task 2" };
  const validStages = mock.stages.length === 4 && new Set(mock.stages.map((stage) => stage.key)).size === 4 && mock.stages.every((stage) => Boolean(safeMockLaunch(stage)));
  return (
    <section className={`${landingFont.className} ${styles.screen}`} aria-labelledby="bundle-title">
      <Link href="/mock?mode=online" className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft size={16} aria-hidden />Full Mock Tests</Link>
      <header className={styles.heading}><p className={styles.eyebrow}>ACADEMIC FULL MOCK</p><h1 id="bundle-title">{mock.title}</h1>{mock.description ? <p className={styles.description}>{mock.description}</p> : null}
        <p className={styles.description}><Clock3 size={15} aria-hidden className="mr-2 inline" />{mockDuration(mock.duration_minutes)}{mock.requires_premium ? " · Premium" : ""}</p>
      </header>
      <p className="mb-6 max-w-2xl text-sm leading-7 text-muted-foreground">Complete Listening, Reading, then Writing Tasks 1 and 2. Each section has its own timer and saved result. Section results are shown separately.</p>
      {validStages ? <div className={styles.grid}>{mock.stages.map((stage, index) => {
        const Icon = stage.key === "reading" ? BookOpen : stage.key === "listening" ? Headphones : PenLine;
        return <Link key={stage.key} href={safeMockLaunch(stage)!} prefetch={false} className={styles.bundle} data-stage={stage.key}>
          <span className={styles.bundleIcon}><Icon size={22} aria-hidden /></span><div className={styles.bundleCopy}><p className="mb-1">{String(index + 1).padStart(2, "0")} · {labels[stage.key]}</p><h2>{stage.title}</h2><p>{mockDuration(stage.time_limit_seconds === null ? null : stage.time_limit_seconds / 60)}</p><span className="mt-4 block text-xs font-semibold text-primary">Open {labels[stage.key]}</span></div><ArrowRight size={17} aria-hidden />
        </Link>;
      })}</div> : <div className={styles.empty} role="alert">This Full Mock has unavailable components. Return to the catalog and try another mock.</div>}
    </section>
  );
}
