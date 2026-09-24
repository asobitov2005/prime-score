"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, FileText, Headphones, Monitor, PenLine, Store } from "lucide-react";
import { buildLoginHref } from "@/lib/subscription-navigation";
import { mockDuration, type OnlineMockCard } from "@/lib/mock-catalog";
import { formatMockPrice, type OfflineMockBooking, type OfflineMockSchedule } from "@/lib/mock-scheduling";
import { useAuthStore } from "@/store/auth-store";
import { MockOfflineCard } from "./mock-offline-card";
import { MockPagination } from "./mock-pagination";
import styles from "./mock-sessions.module.css";

type Mode = "online" | "offline";

function formatScheduleTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tashkent", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function MockSessions({ initialMode }: { initialMode?: Mode }) {
  const router = useRouter();
  const hasSelectedMode = useRef(false);
  const pendingMode = useRef<Mode | null>(null);
  const bookingRequest = useRef<AbortController | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode ?? "online");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [schedules, setSchedules] = useState<OfflineMockSchedule[]>([]);
  const [onlineMocks, setOnlineMocks] = useState<OnlineMockCard[]>([]);
  const [bookings, setBookings] = useState<OfflineMockBooking[]>([]);
  const [booking, setBooking] = useState<OfflineMockBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [reload, setReload] = useState(0);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isBooking = bookingId !== null;
  const pageSize = mode === "offline" ? 6 : 8;

  function selectMode(nextMode: Mode) {
    hasSelectedMode.current = true;
    if (nextMode === mode) return;
    pendingMode.current = nextMode;
    setMode(nextMode);
    setPage(1);
    setTotal(0);
    setIsLoading(true);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", nextMode);
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }

  useEffect(() => {
    const nextMode = initialMode ?? "online";
    if (pendingMode.current && pendingMode.current !== nextMode) return;
    pendingMode.current = null;
    setMode(nextMode);
    setPage(1);
  }, [initialMode]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setCatalogError("");
    setSchedules([]);
    setOnlineMocks([]);
    const endpoint = mode === "offline" ? "offline-schedules" : "online-mocks";
    fetch(`/api/mock/${endpoint}?page=${page}&page_size=${pageSize}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(typeof payload.detail === "string" ? payload.detail : "Could not load mock sessions.");
        if (!Array.isArray(payload.items) || !Number.isInteger(payload.total)) throw new Error("The mock catalog returned an invalid response.");
        if (controller.signal.aborted) return;
        setTotal(payload.total);
        const lastPage = Math.max(1, Math.ceil(payload.total / pageSize));
        if (page > lastPage) { setPage(lastPage); return; }
        if (mode === "offline") setSchedules(payload.items);
        else setOnlineMocks(payload.items);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setCatalogError(reason instanceof Error ? reason.message : "Could not load mock sessions.");
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [mode, page, pageSize, reload]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    if (new URL(window.location.href).searchParams.has("mockBooking")) return;
    const controller = new AbortController();
    fetch("/api/mock/bookings/me", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const { items } = await response.json() as { items: OfflineMockBooking[] };
        if (controller.signal.aborted) return;
        setBookings(items);
        if (!items[0]) return;
        setBooking(items[0]);
        if (!initialMode && !hasSelectedMode.current) { setMode("offline"); setPage(1); }
      })
      .catch(() => { /* Reservation recovery must not prevent catalog browsing. */ });
    return () => controller.abort();
  }, [hasHydrated, isAuthenticated, initialMode]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    const pendingId = new URL(window.location.href).searchParams.get("mockBooking");
    if (!pendingId) return;
    const controller = new AbortController();
    bookingRequest.current = controller;
    setMode("offline");
    setBookingId(pendingId);
    setBookingError("");
    fetch("/api/mock/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule_id: pendingId }), signal: controller.signal,
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(typeof payload.detail === "string" ? payload.detail : "Could not book this mock.");
      if (controller.signal.aborted) return;
      setBooking(payload);
      setBookings((current) => [...current.filter((item) => item.schedule_id !== pendingId), payload]);
      setReload((value) => value + 1);
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) setBookingError(reason instanceof Error ? reason.message : "Could not book this mock.");
    }).finally(() => {
      if (controller.signal.aborted) return;
      bookingRequest.current = null;
      setBookingId(null);
      const url = new URL(window.location.href);
      url.searchParams.delete("mockBooking");
      url.searchParams.set("mode", "offline");
      router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    });
    return () => controller.abort();
  }, [hasHydrated, isAuthenticated, router]);

  useEffect(() => () => bookingRequest.current?.abort(), []);

  async function reserveSchedule(schedule: OfflineMockSchedule) {
    if (!hasHydrated || bookingRequest.current) return;
    if (!isAuthenticated) {
      window.location.assign(buildLoginHref(`/mock?mode=offline&mockBooking=${encodeURIComponent(schedule.id)}`));
      return;
    }
    const controller = new AbortController();
    bookingRequest.current = controller;
    setBookingId(schedule.id);
    setBookingError("");
    try {
      const response = await fetch("/api/mock/bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule_id: schedule.id }), signal: controller.signal,
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          window.location.assign(buildLoginHref(`/mock?mode=offline&mockBooking=${encodeURIComponent(schedule.id)}`));
          return;
        }
        if (response.status === 409) setReload((value) => value + 1);
        throw new Error(typeof payload.detail === "string" ? payload.detail : "Could not book this mock.");
      }
      if (controller.signal.aborted) return;
      setBooking(payload);
      setBookings((current) => [...current.filter((item) => item.schedule_id !== schedule.id), payload]);
      if (response.status === 201) setReload((value) => value + 1);
    } catch (reason) {
      if (!controller.signal.aborted) setBookingError(reason instanceof Error ? reason.message : "Could not book this mock.");
    } finally {
      if (!controller.signal.aborted) { bookingRequest.current = null; setBookingId(null); }
    }
  }

  const items = mode === "offline" ? schedules : onlineMocks;
  const totalPages = Math.ceil(total / pageSize);
  const supportMessage = booking
    ? `Hello, I reserved ${booking.title} on ${formatScheduleTime(booking.starts_at)}. I paid ${formatMockPrice(booking.price_amount, booking.currency)} via Click and am sending the receipt.`
    : "Hello, I have a question about an offline IELTS mock payment via Click.";
  const supportUrl = `https://t.me/TheBugcreator?text=${encodeURIComponent(supportMessage)}`;

  return (
    <section className={styles.screen} id="mock" aria-labelledby="mock-title">
      <div className={styles.switch} role="group" aria-label="Mock session type">
        <button type="button" className={styles.mode} aria-pressed={mode === "online"} onClick={() => selectMode("online")}><Monitor size={23} aria-hidden /><strong>Online</strong><small>Practice from home</small></button>
        <button type="button" className={styles.mode} aria-pressed={mode === "offline"} onClick={() => selectMode("offline")}><Store size={23} aria-hidden /><strong>Offline</strong><small>Choose a session</small></button>
      </div>
      <header className={styles.heading}>
        {mode === "offline" ? <p className={styles.eyebrow}>OFFLINE MOCKS</p> : null}
        <h1 id="mock-title">{mode === "online" ? "Full Mock Tests" : "Book your mock"}</h1>
        <p className={styles.description}>{mode === "online" ? "Take complete IELTS practice tests and get feedback on your skills. Build your skills, track your progress." : "Reading, Listening, Writing and Speaking"}</p>
      </header>
      {mode === "offline" ? <>
        <div className={styles.toolbar}><span>Times shown in Tashkent time</span></div>
        {booking ? <div className={styles.notice} role="status"><CheckCircle2 size={19} aria-hidden /><div><strong>Reservation saved</strong><small>{booking.title} · {formatScheduleTime(booking.starts_at)} · {formatMockPrice(booking.price_amount, booking.currency)}</small><small>Pay via Click, then send your receipt screenshot to support.</small><a href={supportUrl} target="_blank" rel="noopener noreferrer">Message @TheBugcreator</a></div></div> : null}
        {bookingError ? <div className={styles.error} role="alert">{bookingError}</div> : null}
      </> : null}
      {catalogError ? <div className={styles.error} role="alert"><span>{catalogError}</span><button type="button" onClick={() => setReload((value) => value + 1)}>Try again</button></div> : null}
      <div aria-busy={isLoading} aria-label={mode === "online" ? "Online mock tests" : "Offline mock schedule"}>
        {isLoading ? <div className={styles.empty} role="status">Loading {mode === "online" ? "Full Mock tests" : "mock sessions"}...</div> : !catalogError && items.length === 0 ? <div className={styles.empty}>{mode === "online" ? "No Full Mock tests have been published yet." : "No upcoming mock sessions are available. Please check back later."}</div> : null}
        {!isLoading && !catalogError ? <div className={styles.grid}>
          {mode === "offline" ? schedules.map((schedule) => <MockOfflineCard key={schedule.id} schedule={schedule} venue={schedule.location} address={schedule.address ?? undefined} reserved={bookings.some((item) => item.schedule_id === schedule.id)} disabled={isLoading || isBooking || !hasHydrated} reserving={bookingId === schedule.id} onBook={() => void reserveSchedule(schedule)} />)
            : onlineMocks.map((mock) => <Link key={mock.id} href={`/mock/online/${mock.id}`} prefetch={false} className={styles.bundle} data-bundle-id={mock.id}>
              <span className={styles.bundleIcon}><FileText size={23} aria-hidden /></span><div className={styles.bundleCopy}><h2>{mock.title}</h2><p>Academic</p><div className={styles.skills}><span><BookOpen size={13} aria-hidden />Reading</span><span><Headphones size={13} aria-hidden />Listening</span><span><PenLine size={13} aria-hidden />Writing</span><span><Clock3 size={13} aria-hidden />{mockDuration(mock.duration_minutes)}</span></div></div><ArrowRight size={17} aria-hidden />
            </Link>)}
        </div> : null}
      </div>
      {!catalogError ? <MockPagination page={page} totalPages={totalPages} disabled={isLoading || isBooking} onChange={(value) => { if (value !== page) { setIsLoading(true); setPage(value); } }} /> : null}
      {mode === "offline" ? <p className={styles.payment}>Pay via Click. To confirm your seat, send the payment receipt screenshot to <a href={supportUrl} target="_blank" rel="noopener noreferrer">@TheBugcreator</a> on Telegram.</p> : null}
    </section>
  );
}
