import { BackendAttemptEvent, TestType } from "./page-dependencies";
import { IntegrityViolationItem } from "./page-part-01";
import { formatViolationTime } from "./page-part-04";

export function formatViolationLabel(eventType: string): string {
  switch (eventType) {
    case "violation_window_blur":
      return "Lost focus (another app opened or overlay)";
    case "violation_exit_fullscreen":
      return "Exited full screen mode";
    case "violation_tab_switch":
      return "Switched tab or browser was hidden";
    case "violation_devtools":
      return "Developer tools were opened";
    default:
      return "Exam integrity violation";
  }
}

export function buildIntegrityViolationItems(events: BackendAttemptEvent[]): IntegrityViolationItem[] {
  return events
    .filter((event) => event.event_type.startsWith("violation_"))
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .map((event, index) => ({
      key: `${event.event_type}-${event.created_at}-${index}`,
      label: formatViolationLabel(event.event_type),
      time: formatViolationTime(event.created_at),
    }));
}

export function formatTestFormat(value: string | null | undefined): string {
  if (!value || value === "full") {
    return "Full Test";
  }
  return value.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function deriveBandScore(
  value: number | string | null | undefined,
  rawScore: number | null | undefined,
  testType: TestType
): number | null {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  if (rawScore === null || rawScore === undefined) {
    return null;
  }

  const table = testType === "listening"
    ? [
        [39, 40, 9.0],
        [37, 38, 8.5],
        [35, 36, 8.0],
        [32, 34, 7.5],
        [30, 31, 7.0],
        [26, 29, 6.5],
        [23, 25, 6.0],
        [18, 22, 5.5],
        [16, 17, 5.0],
        [13, 15, 4.5],
        [11, 12, 4.0],
        [8, 10, 3.5],
        [6, 7, 3.0],
        [4, 5, 2.5],
        [3, 3, 2.0],
        [2, 2, 1.0],
      ]
    : [
        [39, 40, 9.0],
        [37, 38, 8.5],
        [35, 36, 8.0],
        [33, 34, 7.5],
        [30, 32, 7.0],
        [27, 29, 6.5],
        [23, 26, 6.0],
        [19, 22, 5.5],
        [15, 18, 5.0],
        [13, 14, 4.5],
        [10, 12, 4.0],
        [8, 9, 3.5],
        [6, 7, 3.0],
        [4, 5, 2.5],
        [3, 3, 2.0],
        [2, 2, 1.0],
      ];

  const normalizedRawScore = Math.max(0, Math.floor(rawScore));
  const match = table.find(([min, max]) => normalizedRawScore >= min && normalizedRawScore <= max);
  return match ? match[2] : null;
}

export function formatBandScore(
  value: number | string | null | undefined,
  rawScore: number | null | undefined,
  testType: TestType
): string {
  const derivedBandScore = deriveBandScore(value, rawScore, testType);
  if (derivedBandScore === null) {
    return "—";
  }
  return derivedBandScore.toFixed(1);
}

export function formatTimeTaken(value: number): string {
  const totalSeconds = Math.max(0, Math.floor(value));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
