'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type TimeFormat = '12h' | '24h';

interface TimeFormatCtx {
  timeFormat: TimeFormat;
  setTimeFormat: (f: TimeFormat) => void;
  /** Format a time string like "09:00" or "14:30" according to user preference */
  formatTime: (time: string) => string;
  /** Format a Date object's time according to user preference */
  formatDateTime: (date: Date) => string;
}

const STORAGE_KEY = 'lifeos-time-format';

const TimeFormatContext = createContext<TimeFormatCtx>({
  timeFormat: '12h',
  setTimeFormat: () => {},
  formatTime: (t) => t,
  formatDateTime: (d) => d.toLocaleTimeString(),
});

function format24to12(h: number, m: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function format24(h: number, m: number): string {
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function TimeFormatProvider({ children }: { children: React.ReactNode }) {
  const [timeFormat, setFormatState] = useState<TimeFormat>('12h');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '24h' || stored === '12h') {
      setFormatState(stored);
    }
  }, []);

  const setTimeFormat = useCallback((f: TimeFormat) => {
    setFormatState(f);
    localStorage.setItem(STORAGE_KEY, f);
  }, []);

  const formatTime = useCallback((time: string): string => {
    const [hStr, mStr] = time.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
    return timeFormat === '24h' ? format24(h, m) : format24to12(h, m);
  }, [timeFormat]);

  const formatDateTime = useCallback((date: Date): string => {
    const h = date.getHours();
    const m = date.getMinutes();
    return timeFormat === '24h' ? format24(h, m) : format24to12(h, m);
  }, [timeFormat]);

  return (
    <TimeFormatContext.Provider value={{ timeFormat, setTimeFormat, formatTime, formatDateTime }}>
      {children}
    </TimeFormatContext.Provider>
  );
}

export const useTimeFormat = () => useContext(TimeFormatContext);
