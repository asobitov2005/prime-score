"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  MapPin,
  Users,
} from "lucide-react";
import { buildLoginHref } from "@/lib/subscription-navigation";
import {
  formatMockPrice,
  getCalendarDays,
  getTashkentDateKey,
  getTashkentMonth,
  getTashkentMonthRange,
  type MockMonth,
  type OfflineMockBooking,
  type OfflineMockSchedule,
} from "@/lib/mock-scheduling";
import type { LandingFeaturedTest } from "@/components/marketing/landing-types";
import { useAuthStore } from "@/store/auth-store";
import styles from "./landing.module.css";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TASHKENT_TIME_ZONE = "Asia/Tashkent";

function formatMonth(month: MockMonth): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: TASHKENT_TIME_ZONE,
  }).format(new Date(Date.UTC(month.year, month.month, 15)));
}

function formatScheduleTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TASHKENT_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function nextMonth(month: MockMonth, offset: number): MockMonth {
  const date = new Date(Date.UTC(month.year, month.month + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function MockSessions({
  tests,
  initialMode,
}: {
  tests: LandingFeaturedTest[];
  initialMode?: "online" | "offline";
}) {
  const router = useRouter();
  const hasSelectedMode = useRef(false);
  const [mode, setMode] = useState<"online" | "offline">(initialMode ?? "online");
  const [month, setMonth] = useState<MockMonth>(() => getTashkentMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => getTashkentDateKey(new Date()));
  const [schedules, setSchedules] = useState<OfflineMockSchedule[]>([]);
  const [booking, setBooking] = useState<OfflineMockBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState("");
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  function selectMode(nextMode: "online" | "offline") {
    hasSelectedMode.current = true;
    setMode(nextMode);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", nextMode);
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }

  function changeMonth(offset: number) {
    const next = nextMonth(month, offset);
    setMonth(next);
    setSelectedDate(`${next.year}-${String(next.month + 1).padStart(2, "0")}-01`);
  }

  useEffect(() => {
    setMode(initialMode ?? "online");
  }, [initialMode]);

  useEffect(() => {
    if (mode !== "offline") {
      setIsLoading(false);
      return;
    }

    const range = getTashkentMonthRange(month);
    const query = new URLSearchParams(range);
    const controller = new AbortController();
    let active = true;
    setIsLoading(true);
    setSchedules([]);
    setError("");

    fetch(`/api/mock/offline-schedules?${query.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || "Could not load mock sessions.");
        return payload as { items: OfflineMockSchedule[] };
      })
      .then((payload) => {
        if (active) setSchedules(payload.items);
      })
      .catch((reason: unknown) => {
        if (active) {
          setSchedules([]);
          setError(reason instanceof Error ? reason.message : "Could not load mock sessions.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [mode, month]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    if (new URL(window.location.href).searchParams.has("mockBooking")) return;

    const controller = new AbortController();
    let active = true;
    fetch("/api/mock/bookings/me", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || "Could not load your reservation.");
        return payload as { items: OfflineMockBooking[] };
      })
      .then(({ items }) => {
        if (!active || !items[0]) return;
        setBooking(items[0]);
        if (!initialMode && !hasSelectedMode.current) {
          setMode("offline");
          setSelectedDate(getTashkentDateKey(new Date(items[0].starts_at)));
          setMonth(getTashkentMonth(new Date(items[0].starts_at)));
        }
      })
      .catch(() => {
        // Existing reservation lookup is supplemental; keep mock browsing available.
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [hasHydrated, isAuthenticated, initialMode]);

  useEffect(() => {
    if (mode !== "offline" || isLoading || schedules.length === 0) return;
    const selectedDateHasSchedule = schedules.some(
      (schedule) => getTashkentDateKey(new Date(schedule.starts_at)) === selectedDate,
    );
    if (!selectedDateHasSchedule) {
      setSelectedDate(getTashkentDateKey(new Date(schedules[0].starts_at)));
    }
  }, [isLoading, mode, schedules, selectedDate]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    const pendingScheduleId = new URL(window.location.href).searchParams.get("mockBooking");
    if (!pendingScheduleId) return;

    setMode("offline");
    setError("");
    setIsBooking(true);
    fetch("/api/mock/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule_id: pendingScheduleId }),
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.detail || "Could not reserve this mock.");
        setBooking(payload as OfflineMockBooking);
        setSelectedDate(getTashkentDateKey(new Date(payload.starts_at)));
        setMonth(getTashkentMonth(new Date(payload.starts_at)));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Could not reserve this mock.");
      })
      .finally(() => {
        setIsBooking(false);
        const url = new URL(window.location.href);
        url.searchParams.delete("mockBooking");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      });
  }, [hasHydrated, isAuthenticated]);

  const sessionsOnDate = schedules.filter(
    (schedule) => getTashkentDateKey(new Date(schedule.starts_at)) === selectedDate,
  );
  const scheduleCountsByDate = new Map<string, number>();
  for (const schedule of schedules) {
    const key = getTashkentDateKey(new Date(schedule.starts_at));
    scheduleCountsByDate.set(key, (scheduleCountsByDate.get(key) ?? 0) + 1);
  }

  async function reserveSchedule(schedule: OfflineMockSchedule) {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      const returnUrl = `/mock?mode=offline&mockBooking=${encodeURIComponent(schedule.id)}`;
      window.location.assign(buildLoginHref(returnUrl));
      return;
    }

    setIsBooking(true);
    setError("");
    try {
      const response = await fetch("/api/mock/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule_id: schedule.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Could not reserve this mock.");
      setBooking(payload as OfflineMockBooking);
      if (response.status === 201) setSchedules((current) => current.map((item) =>
        item.id === schedule.id
          ? { ...item, reserved_count: item.reserved_count + 1, available_seats: Math.max(0, item.available_seats - 1) }
          : item,
      ).filter((item) => item.available_seats > 0));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reserve this mock.");
    } finally {
      setIsBooking(false);
    }
  }

  const calendarDays = getCalendarDays(month);
  const todayKey = getTashkentDateKey(new Date());
  const onlineTests = tests.filter((test) => test.type === "reading" || test.type === "listening").slice(0, 4);
  const supportMessage = booking
    ? `Hello, I reserved ${booking.title} on ${formatScheduleTime(booking.starts_at)}. I paid ${formatMockPrice(booking.price_amount, booking.currency)} via Click and am sending the receipt.`
    : "Hello, I have a question about an offline IELTS mock payment via Click.";
  const supportUrl = `https://t.me/TheBugcreator?text=${encodeURIComponent(supportMessage)}`;

  return (
    <section
      className={`${styles.mockSection} ${styles.mockAppSection} ${styles.mockTheme}`}
      id="mock"
      aria-labelledby="mock-title"
    >
      <div className={styles.mockHeading}>
        <div>
          <p className={styles.eyebrow}>YOUR MOCK, YOUR WAY</p>
          <h2 id="mock-title">Mock sessions</h2>
        </div>
        <p>Choose a published online test or book a seat at an in-person session.</p>
      </div>

      <div className={styles.mockModeSwitch} role="group" aria-label="Mock session type">
        <button
          type="button"
          aria-pressed={mode === "online"}
          className={styles.mockModeButton}
          data-active={mode === "online"}
          onClick={() => selectMode("online")}
        >
          <BookOpen size={18} aria-hidden="true" />
          <span>Online</span>
          <small>Practice here</small>
        </button>
        <button
          type="button"
          aria-pressed={mode === "offline"}
          className={styles.mockModeButton}
          data-active={mode === "offline"}
          onClick={() => selectMode("offline")}
        >
          <CalendarDays size={18} aria-hidden="true" />
          <span>Offline</span>
          <small>Choose a session</small>
        </button>
      </div>

      {mode === "online" ? (
        <div className={styles.mockOnlinePanel} aria-label="Online mock tests">
          <div className={styles.mockPanelIntro}>
            <div>
              <p className={styles.mockKicker}>START NOW</p>
              <h3>Choose a practice test</h3>
            </div>
            <Link href="/tests" className={styles.mockTextLink} prefetch={false}>
              Browse all <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          {onlineTests.length ? (
            <div className={styles.mockOnlineGrid}>
              {onlineTests.map((test) => {
                const Icon = test.type === "listening" ? Headphones : BookOpen;
                return (
                  <Link href={`/tests/${test.slug}`} key={test.id} className={styles.mockOnlineCard} prefetch={false}>
                    <span className={styles.mockSkillIcon}><Icon size={19} aria-hidden="true" /></span>
                    <span className={styles.mockOnlineCopy}>
                      <strong>{test.title}</strong>
                      <small>{test.type} <span aria-hidden="true">·</span> {test.estimatedMinutes} min</small>
                    </span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className={styles.mockEmpty}>Online tests are temporarily unavailable. Browse the library to try again.</p>
          )}
        </div>
      ) : (
        <div className={styles.mockOfflinePanel} aria-label="Offline mock schedule">
          <div className={styles.mockCalendarColumn}>
            <div className={styles.mockPanelIntro}>
              <div>
                <p className={styles.mockKicker}>UPCOMING SESSIONS</p>
                <h3>Pick a date</h3>
              </div>
              <div className={styles.mockMonthControl}>
                <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
                  <ChevronLeft size={17} aria-hidden="true" />
                </button>
                <span>{formatMonth(month)}</span>
                <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className={styles.mockCalendar} aria-label={formatMonth(month)}>
              {WEEKDAYS.map((day) => <span key={day} className={styles.mockWeekday}>{day}</span>)}
              {calendarDays.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} aria-hidden="true" />;
                const dateKey = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const count = scheduleCountsByDate.get(dateKey) ?? 0;
                const isPast = dateKey < todayKey;
                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={styles.mockDay}
                    data-selected={selectedDate === dateKey}
                    data-available={count > 0}
                    disabled={isPast || count === 0 || isLoading}
                    aria-label={`${count} available sessions on ${dateKey}`}
                    aria-pressed={selectedDate === dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <span>{day}</span>
                    {count > 0 ? <i aria-hidden="true">{count}</i> : null}
                  </button>
                );
              })}
            </div>
            <div className={styles.mockLegend}>
              <span><i aria-hidden="true" /> Available sessions</span>
              <span>Times shown in Tashkent time</span>
            </div>
          </div>

          <div className={styles.mockSessionColumn}>
            <div className={styles.mockPanelIntro}>
              <div>
                <p className={styles.mockKicker}>AVAILABLE ON</p>
                <h3>{new Intl.DateTimeFormat("en-US", { timeZone: TASHKENT_TIME_ZONE, day: "numeric", month: "long" }).format(new Date(`${selectedDate}T12:00:00+05:00`))}</h3>
              </div>
              {isLoading ? <span className={styles.mockStatus}>Loading</span> : null}
            </div>

            {error ? (
              <div className={styles.mockError} role="alert">
                <span>{error}</span>
                <button type="button" onClick={() => setMonth((current) => ({ ...current }))}>Try again</button>
              </div>
            ) : null}
            {booking ? (
              <div className={styles.mockBookedNotice} role="status">
                <CheckCircle2 size={19} aria-hidden="true" />
                <span>
                  <strong>Reservation saved</strong>
                  <small>{booking.title} · {formatScheduleTime(booking.starts_at)} · {formatMockPrice(booking.price_amount, booking.currency)}</small>
                  <small>Pay via Click, then send your receipt screenshot to support.</small>
                  <a href={supportUrl} target="_blank" rel="noopener noreferrer">Message @TheBugcreator</a>
                </span>
              </div>
            ) : null}
            {sessionsOnDate.length > 0 ? (
              <div className={styles.mockSessionList}>
                {sessionsOnDate.map((schedule) => (
                  <article className={styles.mockSessionCard} key={schedule.id}>
                    <div className={styles.mockSessionTop}>
                      <div>
                        <h4>{schedule.title}</h4>
                        <p><Clock3 size={14} aria-hidden="true" /> {formatScheduleTime(schedule.starts_at)}</p>
                      </div>
                      <strong>{formatMockPrice(schedule.price_amount, schedule.currency)}</strong>
                    </div>
                    <div className={styles.mockSessionMeta}>
                      <span><MapPin size={13} aria-hidden="true" /> {schedule.location}</span>
                      <span><Users size={13} aria-hidden="true" /> {schedule.available_seats} seat{schedule.available_seats === 1 ? "" : "s"}</span>
                      <span>{schedule.duration_minutes} min</span>
                    </div>
                    <button
                      type="button"
                      className={styles.mockReserveButton}
                      disabled={isLoading || isBooking || !hasHydrated || booking?.schedule_id === schedule.id}
                      onClick={() => void reserveSchedule(schedule)}
                    >
                      {booking?.schedule_id === schedule.id ? "Reserved" : isBooking ? "Reserving..." : hasHydrated && !isAuthenticated ? "Sign in to reserve" : "Reserve seat"}
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.mockEmptySlot}>
                <CalendarDays size={22} aria-hidden="true" />
                <p>{error ? "Schedule could not be loaded." : isLoading ? "Checking available sessions..." : "No sessions on this date. Choose a marked date or check another month."}</p>
              </div>
            )}
            <p className={styles.mockDemoNote}>
              Pay via Click. To confirm your seat, send the payment receipt screenshot to{" "}
              <a href={supportUrl} target="_blank" rel="noopener noreferrer">@TheBugcreator</a> on Telegram.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
