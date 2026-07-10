"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Input, cn, useEffect, useMemo, useRef, useState } from "./dependencies";

import { clampTimeInputPart, formatDateOnlyInputValue, formatDateTimeButtonLabel, formatMonthLabel, getDateInputPart, getTimeInputPart, parseDateTimeInputValue } from "./shared-part-01";

import { DateTimePickerFieldProps, WEEKDAY_LABELS, addMonths, buildCalendarDays, getMonthIndex, isBeforeDay, isSameDay, startOfMonth } from "./shared-part-02";



export function DateTimePickerField({ value, onChange, minValue, placeholder }: DateTimePickerFieldProps) {
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = value ? parseDateTimeInputValue(value) : null;
  const minDate = minValue ? parseDateTimeInputValue(minValue) : null;
  const minDatePart = minValue ? getDateInputPart(minValue) : "";
  const selectedDatePart = value ? getDateInputPart(value) : "";
  const selectedTimePart = value ? getTimeInputPart(value) : "";
  const timeMin = selectedDatePart && minDatePart && selectedDatePart === minDatePart
    ? getTimeInputPart(minValue ?? "")
    : undefined;
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(selectedDate ?? minDate ?? new Date()));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setVisibleMonth(startOfMonth(selectedDate ?? minDate ?? new Date()));
  }, [isOpen, minDate, selectedDate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const canMovePrev = !minDate || getMonthIndex(addMonths(visibleMonth, -1)) >= getMonthIndex(startOfMonth(minDate));

  const handleDateSelect = (date: Date) => {
    const nextDatePart = formatDateOnlyInputValue(date);
    const nextMinTime = minDatePart === nextDatePart ? getTimeInputPart(minValue ?? "") : undefined;
    const nextTimePart = clampTimeInputPart(selectedTimePart || nextMinTime || "09:00", nextMinTime);
    onChange(`${nextDatePart}T${nextTimePart}`);
  };

  const handleTimeSelect = (nextTimePart: string) => {
    if (!selectedDatePart) {
      return;
    }

    onChange(`${selectedDatePart}T${clampTimeInputPart(nextTimePart, timeMin)}`);
  };

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/70 px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/30 hover:bg-card",
          isOpen && "border-primary/40 bg-card",
        )}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className={cn("block text-sm font-medium", value ? "text-foreground" : "text-muted-foreground")}>
              {value ? formatDateTimeButtonLabel(value) : placeholder}
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {value ? "Click to change date or time" : "Choose a date from the calendar, then set the time"}
            </span>
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen ? (
        <div className="absolute inset-x-0 top-full z-50 mt-3 overflow-hidden rounded-[1.35rem] border border-border/60 bg-popover/95 shadow-2xl shadow-black/30 backdrop-blur-xl md:inset-x-auto md:w-[360px]">
          <div className="border-b border-border/50 bg-background/40 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Date</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{formatMonthLabel(visibleMonth)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => canMovePrev && setVisibleMonth((current) => addMonths(current, -1))}
                  disabled={!canMovePrev}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 text-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="py-1">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(({ date, inCurrentMonth }) => {
                const disabled = Boolean(minDate && isBeforeDay(date, minDate));
                const selected = Boolean(selectedDate && isSameDay(date, selectedDate));
                const today = isSameDay(date, new Date());

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => !disabled && handleDateSelect(date)}
                    disabled={disabled}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-xl text-sm font-medium transition-colors",
                      inCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
                      !disabled && "hover:bg-primary/10 hover:text-primary",
                      selected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      today && !selected && "ring-1 ring-primary/35",
                      disabled && "cursor-not-allowed text-muted-foreground/25",
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border/50 bg-background/50 p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Time
              </div>
              <Input
                type="time"
                value={selectedTimePart}
                min={timeMin}
                step={300}
                onChange={(event) => handleTimeSelect(event.target.value)}
                disabled={!selectedDatePart}
                className="h-11 rounded-xl [color-scheme:dark]"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {selectedDatePart ? "Five-minute steps keep scheduling consistent." : "Pick a date first, then choose the time."}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function buildStartDateIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseDateTimeInputValue(value);
  if (!parsed) {
    return undefined;
  }

  return parsed.toISOString();
}

export function buildEndDateIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseDateTimeInputValue(value);
  if (!parsed) {
    return undefined;
  }

  return parsed.toISOString();
}

export function normalizeCodeInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

export function normalizePrefix(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
