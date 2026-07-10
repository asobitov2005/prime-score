"use client";
import type { StreakHeatmapScope } from "./controller";
import { cn } from "../dependencies";
import { WEEKDAYS, formatMinutes, formatSelectedDay, getCellTone } from "../shared";

export function StreakHeatmapSection6({ scope }: { scope: StreakHeatmapScope }) {
  const { monthCells, effectiveSelectedDayKey, setSelectedDayKey } = scope;
  return (
    <div className="min-h-[292px] rounded-3xl border border-border/70 bg-card/50 p-5 shadow-sm ring-1 ring-border/25 w-fit mx-auto lg:mx-0 transition-colors hover:bg-card/60 shrink-0">
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-7 gap-2 text-center mb-1">
                      {WEEKDAYS.map((day) => (
                        <span key={day} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                          {day.slice(0, 2)}
                        </span>
                      ))}
                    </div>
    
                    <div className="grid grid-cols-7 gap-2">
                      {monthCells.map((cell) => {
                        const isSelected = cell.key === effectiveSelectedDayKey;
                        const toneClass = getCellTone(cell.attemptsCount, cell.isFuture);
    
                        return (
                          <button
                            key={cell.key}
                            type="button"
                            disabled={!cell.inMonth}
                            onClick={() => setSelectedDayKey(cell.key)}
                            aria-label={`${formatSelectedDay(cell.date)} · ${cell.attemptsCount} attempt${cell.attemptsCount === 1 ? "" : "s"} · ${formatMinutes(cell.timeSpentSec)}`}
                            title={`${formatSelectedDay(cell.date)} · ${cell.attemptsCount} attempt${cell.attemptsCount === 1 ? "" : "s"} · ${formatMinutes(cell.timeSpentSec)}`}
                            className={cn(
                              "group relative flex h-[28px] w-[40px] sm:h-[30px] sm:w-[46px] rounded-[8px] sm:rounded-[10px] border text-left transition-colors duration-150 disabled:pointer-events-none overflow-hidden",
                              cell.inMonth ? "opacity-100" : "opacity-0 invisible",
                              toneClass,
                              isSelected && "ring-2 ring-offset-[1.5px] ring-emerald-500/60 ring-offset-background shadow-sm z-20",
                              cell.isToday && !isSelected && "ring-1 ring-orange-500/60 ring-offset-1 ring-offset-background",
                              !isSelected && !cell.isFuture && cell.inMonth && cell.attemptsCount === 0 && "hover:bg-muted/50 border-border/60",
                              !isSelected && !cell.isFuture && cell.attemptsCount > 0 && "hover:shadow-sm hover:z-20"
                            )}
                          >
                            {isSelected ? (
                              <div className="absolute inset-0 bg-white/20 dark:bg-white/10" />
                            ) : null}
                            <span className="flex h-full w-full items-center justify-center relative z-10">
                              <span className={cn(
                                "text-[11px] sm:text-xs font-bold tracking-tight",
                                cell.attemptsCount > 0 && cell.inMonth ? "text-current drop-shadow-sm" : "text-inherit",
                              )}>
                                {cell.date.getUTCDate()}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
    
                    <div className="flex items-center justify-end gap-2 text-[10px] text-muted-foreground font-semibold mt-2 pt-2 border-t border-border/40">
                      <span>Less</span>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 5].map((count) => (
                          <span
                            key={count}
                            className={cn("h-3 w-3 rounded-[4px] border", getCellTone(count, false))}
                          />
                        ))}
                      </div>
                      <span>More</span>
                    </div>
                  </div>
                </div>
  );
}
