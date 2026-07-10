"use client";
import type { BaseScope } from "./base";
import { DashboardActivityPoint, useMemo, useState } from "../dependencies";
import { addMonths, buildMonthCells, formatMonthKey, formatMonthLabel, getDefaultSelectedDayKey, getTodayKey, parseMonthKey } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const { activity } = scope;
  const todayKey = useMemo(() => getTodayKey(), []);

  const todayMonthKey = todayKey.slice(0, 7);

  const activityByDate = useMemo(() => {
      const map = new Map<string, DashboardActivityPoint>();
      for (const point of activity) {
        map.set(point.activityDate, point);
      }
      return map;
    }, [activity]);

  const monthList = useMemo(() => {
      const earliestMonthKey = activity.length > 0
        ? activity.map((point) => point.activityDate.slice(0, 7)).sort()[0]
        : todayMonthKey;
      const startMonth = parseMonthKey(earliestMonthKey);
      const endMonth = parseMonthKey(todayMonthKey);
      const months: Date[] = [];
  
      for (let cursor = startMonth; cursor <= endMonth; cursor = addMonths(cursor, 1)) {
        months.push(cursor);
      }
  
      return months;
    }, [activity, todayMonthKey]);

  const initialMonthIndex = useMemo(() => {
      const latestActivityMonthKey = activity.length > 0
        ? activity.map((point) => point.activityDate.slice(0, 7)).sort().at(-1) ?? todayMonthKey
        : todayMonthKey;
      const index = monthList.findIndex((month) => formatMonthKey(month) === latestActivityMonthKey);
      return index >= 0 ? index : monthList.length - 1;
    }, [activity, monthList, todayMonthKey]);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(initialMonthIndex);

  const selectedMonth = monthList[selectedMonthIndex] ?? parseMonthKey(todayMonthKey);

  const monthCells = useMemo(
      () => buildMonthCells(selectedMonth, activityByDate, todayKey),
      [activityByDate, selectedMonth, todayKey],
    );

  const [selectedDayKey, setSelectedDayKey] = useState(getDefaultSelectedDayKey(monthCells));

  const activeDays = monthCells.filter((cell) => cell.inMonth && cell.attemptsCount > 0).length;

  const totalAttempts = monthCells
      .filter((cell) => cell.inMonth)
      .reduce((sum, cell) => sum + cell.attemptsCount, 0);

  const totalTimeSpentSec = monthCells
      .filter((cell) => cell.inMonth)
      .reduce((sum, cell) => sum + cell.timeSpentSec, 0);

  const defaultSelectedDayKey = getDefaultSelectedDayKey(monthCells);

  const effectiveSelectedDayKey = monthCells.some((cell) => cell.key === selectedDayKey)
      ? selectedDayKey
      : defaultSelectedDayKey;

  const selectedCell = monthCells.find((cell) => cell.key === effectiveSelectedDayKey) ?? monthCells[0];

  const selectedMonthLabel = formatMonthLabel(selectedMonth);

  const prevMonthKey = useMemo(() => formatMonthKey(addMonths(selectedMonth, -1)), [selectedMonth]);

  const prevActiveDays = useMemo(() => activity.filter(a => a.activityDate.startsWith(prevMonthKey) && a.attemptsCount > 0).length, [activity, prevMonthKey]);

  const prevTotalAttempts = useMemo(() => activity.filter(a => a.activityDate.startsWith(prevMonthKey)).reduce((sum, a) => sum + a.attemptsCount, 0), [activity, prevMonthKey]);

  const prevTotalTimeSpentSec = useMemo(() => activity.filter(a => a.activityDate.startsWith(prevMonthKey)).reduce((sum, a) => sum + a.timeSpentSec, 0), [activity, prevMonthKey]);

  function moveMonth(delta: number) {
      const nextIndex = Math.min(Math.max(selectedMonthIndex + delta, 0), monthList.length - 1);
      if (nextIndex === selectedMonthIndex) {
        return;
      }
  
      const nextMonth = monthList[nextIndex];
      const nextCells = buildMonthCells(nextMonth, activityByDate, todayKey);
      setSelectedMonthIndex(nextIndex);
      setSelectedDayKey(getDefaultSelectedDayKey(nextCells));
    }

  return { todayKey, todayMonthKey, activityByDate, monthList, initialMonthIndex, selectedMonthIndex, setSelectedMonthIndex, selectedMonth, monthCells, selectedDayKey, setSelectedDayKey, activeDays, totalAttempts, totalTimeSpentSec, defaultSelectedDayKey, effectiveSelectedDayKey, selectedCell, selectedMonthLabel, prevMonthKey, prevActiveDays, prevTotalAttempts, prevTotalTimeSpentSec, moveMonth };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
