"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Eye, EyeOff, MapPin, Minus, Pencil, Plus, Users } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@/components/ui";
import { adminApi } from "@/lib/api";
import type { AdminOfflineMockSchedule, AdminOfflineMockScheduleInput } from "@/lib/types";
import { MockSectionNav } from "@/components/mock-section-nav";

const TIME_ZONE = "Asia/Tashkent";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_TIME_SLOTS = 12;

type CalendarMonth = { year: number; month: number };

type ScheduleForm = {
  title: string;
  timeSlots: string[];
  durationMinutes: string;
  location: string;
  address: string;
  capacity: string;
  priceAmount: string;
  isPublished: boolean;
};

function tashkentDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function monthForDateKey(dateKey: string): CalendarMonth {
  const [year, month] = dateKey.split("-").map(Number);
  return { year, month: month - 1 };
}

function getCalendarDays({ year, month }: CalendarMonth): Array<number | null> {
  const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const leadingDays = (firstDay + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [
    ...Array<number | null>(leadingDays).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
}

function formatMonth({ year, month }: CalendarMonth): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month, 15)));
}

function formatDayLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateKey}T12:00:00+05:00`));
}

function nextMonth(month: CalendarMonth, offset: number): CalendarMonth {
  const date = new Date(Date.UTC(month.year, month.month + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function initialDate(): string {
  return tashkentDateKey(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
}

function emptyForm(): ScheduleForm {
  return {
    title: "Offline IELTS Mock",
    timeSlots: ["11:00"],
    durationMinutes: "180",
    location: "Tashkent",
    address: "",
    capacity: "12",
    priceAmount: "100000",
    isPublished: true,
  };
}

function nextAvailableTime(times: string[]): string {
  const used = new Set(times);
  const latestMinute = Math.max(...times.map((time) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  }));
  const preferredStart = latestMinute + 120;
  const candidates = [
    ...Array.from({ length: 25 }, (_, index) => preferredStart + index * 30),
    ...Array.from({ length: 25 }, (_, index) => 8 * 60 + index * 30),
  ];
  for (const totalMinutes of candidates) {
    if (totalMinutes < 8 * 60 || totalMinutes > 20 * 60) continue;
    const time = `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
    if (!used.has(time)) return time;
  }
  return "09:00";
}

function scheduleForm(schedule: AdminOfflineMockSchedule): ScheduleForm {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(schedule.startsAt));
  const part = (name: string) => parts.find((item) => item.type === name)?.value ?? "00";
  return {
    title: schedule.title,
    timeSlots: [`${part("hour")}:${part("minute")}`],
    durationMinutes: String(schedule.durationMinutes),
    location: schedule.location,
    address: schedule.address ?? "",
    capacity: String(schedule.capacity),
    priceAmount: String(schedule.priceAmount),
    isPublished: schedule.isPublished,
  };
}

function toPayload(
  form: ScheduleForm,
  date: string,
  time: string,
): AdminOfflineMockScheduleInput {
  const start = new Date(`${date}T${time}:00+05:00`);
  if (Number.isNaN(start.getTime())) throw new Error("Enter a valid Tashkent date and time.");
  return {
    title: form.title.trim(),
    startsAt: start.toISOString(),
    durationMinutes: Number(form.durationMinutes),
    location: form.location.trim(),
    address: form.address.trim() || null,
    capacity: Number(form.capacity),
    priceAmount: Number(form.priceAmount),
    isPublished: form.isPublished,
  };
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} UZS`;
}

export function MockScheduleManager() {
  const [selectedDate, setSelectedDate] = useState(() => initialDate());
  const [month, setMonth] = useState(() => monthForDateKey(initialDate()));
  const [schedules, setSchedules] = useState<AdminOfflineMockSchedule[]>([]);
  const [form, setForm] = useState<ScheduleForm>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    adminApi.listOfflineMockSchedules()
      .then((items) => { if (active) setSchedules(items); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Schedules could not load."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const schedulesByDate = new Map<string, AdminOfflineMockSchedule[]>();
  for (const schedule of schedules) {
    const key = tashkentDateKey(new Date(schedule.startsAt));
    schedulesByDate.set(key, [...(schedulesByDate.get(key) ?? []), schedule]);
  }
  const selectedSchedules = [...(schedulesByDate.get(selectedDate) ?? [])]
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const calendarDays = getCalendarDays(month);

  function selectDate(dateKey: string) {
    if (editingId) return;
    setSelectedDate(dateKey);
    setForm((current) => ({ ...current, timeSlots: ["11:00"] }));
    setError("");
    setNotice("");
  }

  async function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const times = editingId ? [form.timeSlots[0]] : form.timeSlots;
      if (!times.length || times.some((time) => !time)) throw new Error("Add at least one start time.");
      if (new Set(times).size !== times.length) throw new Error("Each slot must have a different start time.");
      const payloads = times.map((time) => toPayload(form, selectedDate, time));

      if (editingId) {
        const saved = await adminApi.updateOfflineMockSchedule(editingId, payloads[0]);
        setSchedules((current) => current.map((item) => item.id === saved.id ? saved : item));
        setNotice("Schedule updated.");
        setEditingId(null);
        return;
      }

      const created: AdminOfflineMockSchedule[] = [];
      for (let index = 0; index < payloads.length; index += 1) {
        try {
          created.push(await adminApi.createOfflineMockSchedule(payloads[index]));
        } catch (reason) {
          setSchedules((current) => [...created, ...current].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
          setForm((current) => ({ ...current, timeSlots: times.slice(index) }));
          const message = reason instanceof Error ? reason.message : "Schedule could not be saved.";
          setError(`${created.length} of ${payloads.length} slots were created. ${times[index]} failed: ${message}`);
          return;
        }
      }
      setSchedules((current) => [...created, ...current].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      setForm((current) => ({ ...current, timeSlots: ["11:00"] }));
      setNotice(`${created.length} ${created.length === 1 ? "session" : "time slots"} added for ${formatDayLabel(selectedDate)}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Schedule could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(schedule: AdminOfflineMockSchedule) {
    const date = tashkentDateKey(new Date(schedule.startsAt));
    setSelectedDate(date);
    setMonth(monthForDateKey(date));
    setEditingId(schedule.id);
    setForm(scheduleForm(schedule));
    setError("");
    setNotice("");
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    setNotice("");
  }

  async function togglePublished(schedule: AdminOfflineMockSchedule) {
    setError("");
    try {
      const updated = await adminApi.updateOfflineMockSchedule(schedule.id, {
        title: schedule.title,
        startsAt: schedule.startsAt,
        durationMinutes: schedule.durationMinutes,
        location: schedule.location,
        address: schedule.address ?? null,
        capacity: schedule.capacity,
        priceAmount: schedule.priceAmount,
        isPublished: !schedule.isPublished,
      });
      setSchedules((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(updated.isPublished ? "Schedule published." : "Schedule unpublished; reservations are preserved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Schedule status could not be changed.");
    }
  }

  function changeMonth(offset: number) {
    const next = nextMonth(month, offset);
    const dateKey = `${next.year}-${String(next.month + 1).padStart(2, "0")}-01`;
    setMonth(next);
    selectDate(dateKey);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12">
      <MockSectionNav current="offline" />
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Offline mocks</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Offline Mock schedules</h1>
        <Badge tone="info">Academic</Badge>
        <p className="text-sm font-medium text-foreground">Reading, Listening, Writing, and Speaking included.</p>
        <p className="max-w-2xl text-sm text-muted-foreground">Pick a day, set one or more session times, and choose the seat capacity and Click price for each time slot. Users send payment receipts to @TheBugcreator for manual confirmation.</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays size={18} aria-hidden="true" /> Schedule calendar</CardTitle>
            <CardDescription>Days with a dot already have sessions. Select a day to add or review its slots.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center justify-between gap-2">
              <Button type="button" variant="outline" size="sm" className="h-9 w-9 px-0" aria-label="Previous month" disabled={Boolean(editingId)} onClick={() => changeMonth(-1)}><ChevronLeft size={16} aria-hidden="true" /></Button>
              <h2 className="text-sm font-semibold text-foreground">{formatMonth(month)}</h2>
              <Button type="button" variant="outline" size="sm" className="h-9 w-9 px-0" aria-label="Next month" disabled={Boolean(editingId)} onClick={() => changeMonth(1)}><ChevronRight size={16} aria-hidden="true" /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((day) => <span key={day} className="py-2 text-[10px] font-medium text-muted-foreground">{day}</span>)}
              {calendarDays.map((day, index) => {
                if (day === null) return <span key={`empty-${index}`} aria-hidden="true" />;
                const dateKey = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const count = schedulesByDate.get(dateKey)?.length ?? 0;
                return (
                  <button
                    key={dateKey}
                    type="button"
                    disabled={Boolean(editingId)}
                    aria-label={`${formatDayLabel(dateKey)}${count ? `, ${count} sessions` : ""}`}
                    aria-pressed={selectedDate === dateKey}
                    onClick={() => selectDate(dateKey)}
                  className="group relative grid aspect-square min-h-9 place-items-center rounded-md text-xs text-foreground transition-colors hover:bg-accent aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {day}
                    {count > 0 ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-600 group-aria-pressed:bg-primary-foreground" aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
              <span className="font-medium text-foreground">{formatDayLabel(selectedDate)}</span>
              <span className="text-muted-foreground">{selectedSchedules.length} {selectedSchedules.length === 1 ? "slot" : "slots"}</span>
            </div>
            {editingId ? <p className="mt-3 text-xs text-muted-foreground">Finish or cancel the edit to change the selected day.</p> : null}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Edit session" : `Add sessions · ${formatDayLabel(selectedDate)}`}</CardTitle>
              <CardDescription>{editingId ? "Update this time slot." : "Each start time creates a separate session with the same duration, seat limit, location, and price."}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(event) => void submitSchedule(event)}>
                <div className="space-y-2">
                  <Label htmlFor="mock-title">Session title</Label>
                  <Input id="mock-title" value={form.title} maxLength={160} required onChange={(event) => setForm({ ...form, title: event.target.value })} />
                </div>
                <fieldset className="space-y-2" disabled={saving}>
                  <legend className="text-sm font-medium text-foreground">Start times · one slot per time</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {form.timeSlots.map((time, index) => (
                      <div key={`time-${index}`} className="flex items-center gap-2">
                        <Input
                          aria-label={`Slot ${index + 1} start time`}
                          type="time"
                          step="900"
                          value={time}
                          required
                          disabled={Boolean(editingId)}
                          onChange={(event) => setForm((current) => ({ ...current, timeSlots: current.timeSlots.map((slot, slotIndex) => slotIndex === index ? event.target.value : slot) }))}
                        />
                        {!editingId && form.timeSlots.length > 1 ? (
                          <Button type="button" variant="ghost" size="sm" className="w-9 px-0" aria-label={`Remove slot ${index + 1}`} onClick={() => setForm((current) => ({ ...current, timeSlots: current.timeSlots.filter((_, slotIndex) => slotIndex !== index) }))}><Minus size={15} aria-hidden="true" /></Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {!editingId && form.timeSlots.length < MAX_TIME_SLOTS ? <Button type="button" variant="outline" size="sm" onClick={() => setForm((current) => ({ ...current, timeSlots: [...current.timeSlots, nextAvailableTime(current.timeSlots)] }))}><Plus size={14} aria-hidden="true" /> Add another time</Button> : null}
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="mock-duration">Duration (min)</Label>
                    <Input id="mock-duration" type="number" min={30} max={360} step={15} value={form.durationMinutes} required onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mock-capacity">Seats per slot</Label>
                    <Input id="mock-capacity" type="number" min={1} max={500} step={1} value={form.capacity} required onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mock-location">Location / venue</Label>
                  <Input id="mock-location" value={form.location} maxLength={255} required onChange={(event) => setForm({ ...form, location: event.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mock-address">Address (optional)</Label>
                  <Input id="mock-address" value={form.address} maxLength={500} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Street, building, and arrival instructions" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mock-price">Price per seat (UZS)</Label>
                  <Input id="mock-price" type="number" min={0} step={1000} value={form.priceAmount} required onChange={(event) => setForm({ ...form, priceAmount: event.target.value })} />
                  <p className="text-xs text-muted-foreground">Users pay through Click and send the receipt screenshot to @TheBugcreator for manual confirmation.</p>
                </div>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={form.isPublished} onChange={(event) => setForm({ ...form, isPublished: event.target.checked })} />
                  Publish for users
                </label>
                {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
                {notice ? <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">{notice}</p> : null}
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {editingId ? <Pencil size={15} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                    {saving ? "Saving..." : editingId ? "Save changes" : `Create ${form.timeSlots.length} ${form.timeSlots.length === 1 ? "session" : "sessions"}`}
                  </Button>
                  {editingId ? <Button type="button" variant="outline" onClick={cancelEditing}>Cancel</Button> : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessions on {formatDayLabel(selectedDate)}</CardTitle>
              <CardDescription>Unpublishing hides a session without removing its reservation history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading schedules...</p> : null}
              {!loading && selectedSchedules.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No sessions for this day. Add one or more times above.</p> : null}
              {selectedSchedules.map((schedule) => (
                <article key={schedule.id} className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-foreground">{formatTime(schedule.startsAt)} · {schedule.title}</h3>
                        <Badge tone={schedule.isPublished ? "success" : "neutral"}>{schedule.isPublished ? "Published" : "Hidden"}</Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <span className="flex items-center gap-2"><Clock3 size={14} aria-hidden="true" />{schedule.durationMinutes} minutes</span>
                        <span className="flex items-center gap-2"><MapPin size={14} aria-hidden="true" />{schedule.location}</span>
                        {schedule.address ? <span className="sm:col-span-2">{schedule.address}</span> : null}
                        <span className="flex items-center gap-2"><Users size={14} aria-hidden="true" />{schedule.availableSeats} available / {schedule.capacity} total seats</span>
                        <span>{schedule.reservedCount} reserved</span>
                        <span>{formatPrice(schedule.priceAmount)} per seat</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => startEditing(schedule)} aria-label={`Edit ${schedule.title} at ${formatTime(schedule.startsAt)}`}><Pencil size={14} aria-hidden="true" />Edit</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => void togglePublished(schedule)} aria-label={schedule.isPublished ? `Unpublish ${schedule.title}` : `Publish ${schedule.title}`}>
                        {schedule.isPublished ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
                        {schedule.isPublished ? "Hide" : "Publish"}
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
