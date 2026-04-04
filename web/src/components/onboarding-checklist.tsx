'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'lifeos-onboarding-checklist';
const POS_KEY = 'lifeos-onboarding-checklist-pos';

interface ChecklistItem {
  id: string;
  label: string;
  desc: string;
}

const ITEMS: ChecklistItem[] = [
  { id: 'coach', label: 'Say hello to your LifeCoach', desc: 'Send your first message in the LifeCoach tab' },
  { id: 'task', label: 'Add your first task', desc: 'Type a task title and hit enter' },
  { id: 'plan', label: 'Create today\'s plan', desc: 'Set your top priorities for the day' },
  { id: 'journal', label: 'Write a journal entry', desc: 'Reflect on how your day is going' },
  { id: 'goal', label: 'Set your first goal', desc: 'What do you want to achieve this quarter?' },
  { id: 'voice', label: 'Send a voice note', desc: 'Your LifeCoach transcribes and processes it' },
];

function getCompleted(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveCompleted(items: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(items)));
}

function getSavedPos(): { x: number; y: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(POS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function OnboardingChecklist() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Drag state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCompleted(getCompleted());
    setDismissed(localStorage.getItem(STORAGE_KEY + '-dismissed') === 'true');
    setPos(getSavedPos());
    setMounted(true);
  }, []);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a')) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = dragRef.current.origX + dx;
      const newY = dragRef.current.origY + dy;
      setPos({ x: newX, y: newY });
    }
    function onUp() {
      setDragging(false);
      if (pos) localStorage.setItem(POS_KEY, JSON.stringify(pos));
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, pos]);

  if (!mounted || dismissed) return null;

  const doneCount = completed.size;
  const totalCount = ITEMS.length;
  const progress = (doneCount / totalCount) * 100;

  if (doneCount >= totalCount) return null;

  function toggleItem(id: string) {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveCompleted(next);
      return next;
    });
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY + '-dismissed', 'true');
  }

  const style: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, zIndex: 50 }
    : {};

  return (
    <div
      ref={containerRef}
      className={`${pos ? '' : 'mb-6'} animate-fade-in ${dragging ? 'cursor-grabbing' : ''}`}
      style={style}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className={`rounded-2xl border border-accent/20 bg-accent/[0.03] overflow-hidden ${dragging ? 'shadow-2xl' : 'shadow-sm'} transition-shadow`}
        onMouseDown={onMouseDown}
      >
        {/* Header — drag handle */}
        <div className={`px-4 py-3 flex items-center justify-between ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}>
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2">
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`text-text-muted/40 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span className="text-xs font-semibold text-text">Get started with LifeOS</span>
          </button>
          <span className="text-[10px] text-text-muted/50">{doneCount}/{totalCount}</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-text/[0.04]">
          <div className="h-full bg-accent transition-all duration-500 ease-out" style={{ width: `${Math.max(progress, 3)}%` }} />
        </div>

        {/* Items */}
        {!collapsed && (
          <div className="py-1">
            {ITEMS.map(item => {
              const isDone = completed.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    isDone ? '' : 'hover:bg-accent/[0.04]'
                  }`}
                >
                  <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                    isDone ? 'bg-accent border-accent' : 'border-text-muted/25 hover:border-accent/50'
                  }`}>
                    {isDone && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-[11px] block leading-tight ${isDone ? 'text-text-muted/35 line-through' : 'text-text font-medium'}`}>
                      {item.label}
                    </span>
                    {!isDone && (
                      <span className="text-[10px] text-text-muted/45 leading-tight">{item.desc}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* X dismiss on hover */}
      {hovering && (
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-bg border border-border/40 shadow-sm flex items-center justify-center text-text-muted/40 hover:text-text-muted hover:bg-surface transition-colors text-sm z-10"
        >
          &times;
        </button>
      )}
    </div>
  );
}
