'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

interface TodayDateCtx {
  /** Selected date in "YYYY-MM-DD" format */
  date: string;
  setDate: (d: string) => void;
  goToday: () => void;
  goPrev: () => void;
  goNext: () => void;
  /** Whether the selected date is today */
  isToday: boolean;
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function shiftDate(d: string, days: number): string {
  const date = new Date(d + 'T12:00:00');
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const TodayDateContext = createContext<TodayDateCtx>({
  date: todayISO(),
  setDate: () => {},
  goToday: () => {},
  goPrev: () => {},
  goNext: () => {},
  isToday: true,
});

export function TodayDateProvider({ children }: { children: ReactNode }) {
  const [date, setDateState] = useState(todayISO);

  const isToday = date === todayISO();

  const goToday = useCallback(() => setDateState(todayISO()), []);
  const goPrev = useCallback(
    () => setDateState((d) => shiftDate(d, -1)),
    [],
  );
  const goNext = useCallback(
    () => setDateState((d) => shiftDate(d, 1)),
    [],
  );
  const setDate = useCallback((d: string) => setDateState(d), []);

  return (
    <TodayDateContext.Provider
      value={{ date, setDate, goToday, goPrev, goNext, isToday }}
    >
      {children}
    </TodayDateContext.Provider>
  );
}

export const useTodayDate = () => useContext(TodayDateContext);
