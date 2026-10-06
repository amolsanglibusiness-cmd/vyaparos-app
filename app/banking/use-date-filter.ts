'use client';

import { createContext, createElement, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type DateFilterPreset = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

interface DateFilterContextValue {
  preset: DateFilterPreset;
  range: DateRange;
  setPreset: (preset: DateFilterPreset) => void;
  setCustomRange: (start: string, end: string) => void;
  customStart: string;
  customEnd: string;
  isDateInRange: (dateStr: string) => boolean;
}

const DateFilterContext = createContext<DateFilterContextValue | null>(null);

function toStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDateOnly(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.slice(0, 10));
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getWeekRange(date: Date): DateRange {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(date: Date): DateRange {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<DateFilterPreset>('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const range = useMemo((): DateRange => {
    const now = new Date();

    switch (preset) {
      case 'today':
        return { start: toStartOfDay(now), end: toEndOfDay(now) };
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: toStartOfDay(yesterday), end: toEndOfDay(yesterday) };
      }
      case 'thisWeek':
        return getWeekRange(now);
      case 'thisMonth':
        return getMonthRange(now);
      case 'custom': {
        const start = parseDateOnly(customStart);
        const end = parseDateOnly(customEnd);
        if (start && end) {
          const startOfRange = toStartOfDay(start);
          const endOfRange = toEndOfDay(end);
          return startOfRange <= endOfRange
            ? { start: startOfRange, end: endOfRange }
            : { start: endOfRange, end: toEndOfDay(startOfRange) };
        }
        return getMonthRange(now);
      }
      default:
        return getMonthRange(now);
    }
  }, [preset, customStart, customEnd]);

  const setPreset = useCallback((nextPreset: DateFilterPreset) => {
    setPresetState(nextPreset);
  }, []);

  const setCustomRange = useCallback((start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setPresetState('custom');
  }, []);

  const isDateInRange = useCallback(
    (dateStr: string) => {
      const parsed = parseDateOnly(dateStr);
      if (!parsed) return false;
      const date = toStartOfDay(parsed);
      return date >= toStartOfDay(range.start) && date <= toStartOfDay(range.end);
    },
    [range]
  );

  const value = useMemo(
    () => ({
      preset,
      range,
      setPreset,
      setCustomRange,
      customStart,
      customEnd,
      isDateInRange,
    }),
    [preset, range, setPreset, setCustomRange, customStart, customEnd, isDateInRange]
  );

  return createElement(DateFilterContext.Provider, { value }, children);
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (!context) {
    throw new Error('useDateFilter must be used inside DateFilterProvider');
  }
  return context;
}
