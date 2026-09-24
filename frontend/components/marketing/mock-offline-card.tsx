import { ArrowRight, Clock3, MapPin, Users } from "lucide-react";
import { mockDateParts, mockTimeRange } from "@/lib/mock-catalog";
import type { OfflineMockSchedule } from "@/lib/mock-scheduling";
import styles from "./mock-sessions.module.css";

export function MockOfflineCard({ schedule, venue, address, reserved, disabled, reserving, onBook }: {
  schedule: OfflineMockSchedule;
  venue: string;
  address?: string;
  reserved: boolean;
  disabled: boolean;
  reserving: boolean;
  onBook: () => void;
}) {
  const date = mockDateParts(schedule.starts_at);
  return (
    <article className={styles.card} aria-label={`${schedule.title}, ${date.full}`} data-schedule-id={schedule.id}>
      <time dateTime={schedule.starts_at} aria-label={date.full} className={styles.date}>
        <small>{date.weekday}</small><span>{date.month}</span><strong>{date.day}</strong>
      </time>
      <div className={styles.session}>
        <p className={styles.time}><Clock3 size={16} aria-hidden /><span>{mockTimeRange(schedule.starts_at, schedule.duration_minutes)}</span></p>
        <div className={styles.venue}><MapPin size={16} aria-hidden /><div><strong>{venue}</strong>{address ? <p>{address}</p> : null}</div></div>
        <span className={styles.badge}>Academic</span>
      </div>
      <div className={styles.actions}>
        <span className={styles.seats}><Users size={15} aria-hidden />{schedule.available_seats} {schedule.available_seats === 1 ? "seat" : "seats"} left</span>
        <button type="button" className={styles.book} disabled={disabled || reserved || schedule.available_seats === 0} onClick={onBook} aria-label={`${reserved ? "Reserved" : "Book seat"}: ${schedule.title}, ${date.full}`}>
          {reserved ? "Reserved" : reserving ? "Booking..." : "Book seat"}<ArrowRight size={15} aria-hidden />
        </button>
      </div>
    </article>
  );
}
