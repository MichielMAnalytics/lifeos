'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

// ── Date helpers ─────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function nextMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toISOString().slice(0, 10);
}

function nextWeekISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function shortDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'No date';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Calendar Date Picker ─────────────────────────────

export interface CalendarDatePickerProps {
  currentDate: string | undefined;
  onSelect: (date: string | null) => void;
  onClose: () => void;
}

export function CalendarDatePicker({ currentDate, onSelect, onClose }: CalendarDatePickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  const todayStr = todayISO();
  const todayDate = new Date(todayStr + 'T00:00:00');

  const [viewYear, setViewYear] = useState(() => {
    if (currentDate) {
      const d = new Date(currentDate + 'T00:00:00');
      return d.getFullYear();
    }
    return todayDate.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (currentDate) {
      const d = new Date(currentDate + 'T00:00:00');
      return d.getMonth();
    }
    return todayDate.getMonth();
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const goToToday = () => {
    setViewYear(todayDate.getFullYear());
    setViewMonth(todayDate.getMonth());
  };

  // Build calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  // Monday = 0, Sunday = 6
  let startDow = firstDayOfMonth.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays: Array<{ day: number; month: number; year: number; isCurrentMonth: boolean }> = [];

  // Previous month fill
  for (let i = startDow - 1; i >= 0; i--) {
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarDays.push({ day: daysInPrevMonth - i, month: prevMonth, year: prevYear, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true });
  }

  // Next month fill (to complete the last row)
  const remaining = 7 - (calendarDays.length % 7);
  if (remaining < 7) {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    for (let d = 1; d <= remaining; d++) {
      calendarDays.push({ day: d, month: nextMonth, year: nextYear, isCurrentMonth: false });
    }
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  const quickOptions = [
    { label: 'Today', date: todayISO(), icon: '\u2600' },
    { label: 'Tomorrow', date: tomorrowISO(), icon: '\u2192' },
    { label: 'Next Monday', date: nextMondayISO(), icon: '\uD83D\uDCC5' },
    { label: 'Next Week', date: nextWeekISO(), icon: '\u23ED' },
    { label: 'No Date', date: null, icon: '\u2715' },
  ];

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-1 w-[280px] border border-border bg-surface rounded-xl shadow-xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Month header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          aria-label="Previous month"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text">{monthLabel}</span>
          <button
            type="button"
            onClick={goToToday}
            className="text-[10px] text-text-muted hover:text-accent px-1.5 py-0.5 rounded-md hover:bg-surface-hover transition-colors"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
          aria-label="Next month"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {weekDays.map((wd) => (
          <div key={wd} className="text-center text-[10px] font-medium text-text-muted/80 py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-3 pb-2">
        {calendarDays.map((cd, idx) => {
          const dateStr = toISO(cd.year, cd.month, cd.day);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === currentDate;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(dateStr)}
              className={cn(
                'h-8 w-full flex items-center justify-center text-[11px] rounded-lg transition-all duration-100',
                !cd.isCurrentMonth && 'text-text-muted',
                cd.isCurrentMonth && !isToday && !isSelected && 'text-text hover:bg-surface-hover',
                isToday && !isSelected && 'text-accent font-bold bg-accent/10',
                isSelected && 'bg-accent text-bg font-bold',
              )}
            >
              {cd.day}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-border/40" />

      {/* Quick options */}
      <div className="p-2 space-y-0.5">
        {quickOptions.map((opt) => {
          const isActive = opt.date === (currentDate ?? null);
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onSelect(opt.date)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2',
                isActive ? 'bg-accent/10 text-accent font-medium' : 'text-text hover:bg-surface-hover',
              )}
            >
              <span className="text-[11px] w-4 text-center opacity-60">{opt.icon}</span>
              <span>{opt.label}</span>
              {opt.date && (
                <span className="ml-auto text-text-muted font-mono text-[10px]">
                  {shortDate(opt.date)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Clear button */}
      {currentDate && (
        <>
          <div className="border-t border-border/40" />
          <div className="p-2">
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="w-full text-center text-xs text-text-muted hover:text-danger py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
            >
              Clear date
            </button>
          </div>
        </>
      )}
    </div>
  );
}
