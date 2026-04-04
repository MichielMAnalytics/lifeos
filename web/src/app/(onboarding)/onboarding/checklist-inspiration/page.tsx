'use client';

import { useState } from 'react';

/**
 * ONBOARDING CHECKLIST INSPIRATION
 * Browse at /onboarding/checklist-inspiration?dev
 *
 * These show how the checklist would look INSIDE the actual app,
 * not in the onboarding flow. Each option shows a different UI approach.
 */

const CHECKLIST_ITEMS = [
  { id: 'coach', label: 'Say hello to your LifeCoach', desc: 'Send your first message', done: true },
  { id: 'task', label: 'Add your first task', desc: 'Type or voice-message it', done: true },
  { id: 'plan', label: 'Create today\'s plan', desc: 'Set your top 3 priorities', done: false },
  { id: 'journal', label: 'Write a journal entry', desc: 'Reflect on your day', done: false },
  { id: 'goal', label: 'Set your first goal', desc: 'What do you want to achieve?', done: false },
  { id: 'voice', label: 'Send a voice note', desc: 'Your LifeCoach transcribes it', done: false },
  { id: 'review', label: 'Complete your daily review', desc: 'Let your LifeCoach summarise your day', done: false },
  { id: 'channel', label: 'Try Telegram or Discord', desc: 'Chat with your LifeCoach anywhere', done: false },
];

function Check({ done }: { done: boolean }) {
  return done ? (
    <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    </div>
  ) : (
    <div className="w-5 h-5 rounded-full border-2 border-text-muted/20 shrink-0" />
  );
}

function Option({ label, name, desc, children }: { label: string; name: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border-2 border-border/40 bg-surface/10 p-5 w-full">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center">{label}</span>
        <h3 className="text-sm font-semibold text-text">{name}</h3>
      </div>
      <p className="text-[10px] text-text-muted/50 mb-4 ml-9">{desc}</p>
      <div className="rounded-xl border border-border/30 bg-bg overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export default function ChecklistInspirationPage() {
  const [dismissedB, setDismissedB] = useState(false);

  return (
    <div className="min-h-screen bg-bg p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-text mb-1">Onboarding Checklist — In-App Inspiration</h1>
        <p className="text-sm text-text-muted mb-2">How it would look inside the actual LifeOS dashboard. Not a separate page.</p>
        <p className="text-xs text-text-muted/50 mb-8">8 items, ordered by importance. Persistent but dismissible.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* A — Top banner with progress bar */}
          <Option label="A" name="Progress Banner" desc="Sits at the top of every page. Collapsible. Inspired by Calendly/ClickUp.">
            {/* Simulated app header */}
            <div className="bg-surface/30 px-4 py-2 border-b border-border/30 flex items-center justify-between">
              <span className="text-xs font-medium text-text">Today</span>
              <span className="text-[10px] text-text-muted/50">LifeOS</span>
            </div>
            {/* Banner */}
            <div className="mx-3 mt-3 rounded-xl border border-accent/20 bg-accent/[0.03] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-text">Get started with LifeOS</span>
                <span className="text-[10px] text-text-muted/50">2 of 8 done</span>
              </div>
              <div className="h-1.5 rounded-full bg-text/[0.06] overflow-hidden mb-3">
                <div className="h-full w-[25%] rounded-full bg-accent transition-all" />
              </div>
              <div className="space-y-2">
                {CHECKLIST_ITEMS.slice(0, 4).map(item => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    <Check done={item.done} />
                    <div>
                      <span className={`text-xs ${item.done ? 'text-text-muted/40 line-through' : 'text-text font-medium'}`}>{item.label}</span>
                      {!item.done && <span className="text-[10px] text-text-muted/50 ml-2">{item.desc}</span>}
                    </div>
                  </div>
                ))}
                <button className="text-[10px] text-accent ml-7">Show all 8 steps</button>
              </div>
            </div>
            <div className="p-4 text-[10px] text-text-muted/30 text-center">— rest of dashboard —</div>
          </Option>

          {/* B — Floating bottom-right widget */}
          <Option label="B" name="Floating Widget" desc="Bottom-right button that expands into a panel. Inspired by Intercom. Dismissible.">
            <div className="relative h-80">
              <div className="p-4 text-[10px] text-text-muted/30">
                <p>Dashboard content here...</p>
              </div>

              {!dismissedB ? (
                <div className="absolute bottom-3 right-3 w-64">
                  <div className="rounded-xl border border-border/40 bg-bg shadow-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-text">Getting started</span>
                      <button onClick={() => setDismissedB(true)} className="text-text-muted/30 hover:text-text-muted text-xs">&times;</button>
                    </div>
                    <div className="h-1.5 rounded-full bg-text/[0.06] overflow-hidden mb-3">
                      <div className="h-full w-[25%] rounded-full bg-accent" />
                    </div>
                    <div className="space-y-2">
                      {CHECKLIST_ITEMS.slice(0, 5).map(item => (
                        <div key={item.id} className="flex items-center gap-2">
                          <Check done={item.done} />
                          <span className={`text-[11px] ${item.done ? 'text-text-muted/40 line-through' : 'text-text'}`}>{item.label}</span>
                        </div>
                      ))}
                      <p className="text-[10px] text-text-muted/40 ml-7">+3 more</p>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDismissedB(false)}
                  className="absolute bottom-3 right-3 w-12 h-12 rounded-full bg-accent shadow-lg flex items-center justify-center text-bg"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
              )}
            </div>
          </Option>

          {/* C — Sidebar panel */}
          <Option label="C" name="Sidebar Panel" desc="Slides in from the right. Can be toggled. Inspired by Asana/Linear.">
            <div className="flex h-72">
              <div className="flex-1 p-4 text-[10px] text-text-muted/30 border-r border-border/30">
                <p className="text-text text-xs font-medium mb-2">Today</p>
                <p>Dashboard content...</p>
              </div>
              <div className="w-56 p-3 bg-surface/20">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-text">Setup guide</span>
                  <span className="text-[9px] text-accent font-medium">2/8</span>
                </div>
                <div className="space-y-1.5">
                  {CHECKLIST_ITEMS.map(item => (
                    <div key={item.id} className="flex items-start gap-2 py-1">
                      <Check done={item.done} />
                      <div>
                        <span className={`text-[11px] block ${item.done ? 'text-text-muted/40 line-through' : 'text-text font-medium'}`}>{item.label}</span>
                        {!item.done && <span className="text-[9px] text-text-muted/50">{item.desc}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Option>

          {/* D — Notification bell dropdown */}
          <Option label="D" name="Bell Dropdown" desc="Behind the notification icon in the header. Badge shows remaining items. Your suggestion.">
            <div className="bg-surface/30 px-4 py-2.5 border-b border-border/30 flex items-center justify-between">
              <span className="text-xs font-medium text-text">Today</span>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent text-[7px] text-bg font-bold flex items-center justify-center">6</span>
                </div>
              </div>
            </div>

            {/* Dropdown */}
            <div className="mx-3 mt-2 mb-3 rounded-xl border border-border/40 bg-bg shadow-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-text">Getting started</span>
                <div className="h-1 w-16 rounded-full bg-text/[0.06] overflow-hidden">
                  <div className="h-full w-[25%] rounded-full bg-accent" />
                </div>
              </div>
              <div className="divide-y divide-border/20">
                {CHECKLIST_ITEMS.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface/30 transition-colors cursor-pointer">
                    <Check done={item.done} />
                    <div className="flex-1 min-w-0">
                      <span className={`text-[11px] block ${item.done ? 'text-text-muted/40 line-through' : 'text-text'}`}>{item.label}</span>
                    </div>
                    {!item.done && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted/30 shrink-0"><polyline points="9 18 15 12 9 6" /></svg>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-3 py-2 border-t border-border/30">
                <button className="text-[10px] text-accent">View all 8 steps</button>
              </div>
            </div>

            <div className="p-3 text-[10px] text-text-muted/30 text-center">— dashboard —</div>
          </Option>

          {/* E — Welcome card on Today page */}
          <Option label="E" name="Welcome Card" desc="Shows at the top of the Today page only. Disappears when all items done. Inspired by Notion.">
            <div className="p-4">
              <div className="rounded-2xl border-2 border-accent/20 bg-accent/[0.03] p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text">Welcome to LifeOS</p>
                    <p className="text-xs text-text-muted mt-0.5">Complete these steps to get the most out of your setup</p>
                  </div>
                  <button className="text-text-muted/30 hover:text-text-muted text-xs shrink-0 ml-4">Dismiss</button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {CHECKLIST_ITEMS.slice(0, 6).map(item => (
                    <div key={item.id} className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${item.done ? 'bg-accent/5' : 'bg-surface/30 hover:bg-surface/50 cursor-pointer'}`}>
                      <Check done={item.done} />
                      <span className={`text-[11px] ${item.done ? 'text-text-muted/40 line-through' : 'text-text font-medium'}`}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-text/[0.06] overflow-hidden">
                    <div className="h-full w-[25%] rounded-full bg-accent" />
                  </div>
                  <span className="text-[10px] text-text-muted/50">2/8</span>
                </div>
              </div>

              <div className="mt-4 text-[10px] text-text-muted/30 text-center">— today page content below —</div>
            </div>
          </Option>

          {/* F — Minimal top bar */}
          <Option label="F" name="Slim Top Bar" desc="One-line bar at the very top. Minimal, non-intrusive. Click to expand.">
            {/* Slim bar */}
            <div className="bg-accent/[0.06] px-4 py-2 flex items-center justify-between border-b border-accent/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {CHECKLIST_ITEMS.slice(0, 8).map((item, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${item.done ? 'bg-accent' : 'bg-text/10'}`} />
                  ))}
                </div>
                <span className="text-[11px] text-text-muted">2 of 8 setup steps done</span>
              </div>
              <button className="text-[10px] text-accent font-medium">Continue setup</button>
            </div>

            {/* App content */}
            <div className="bg-surface/30 px-4 py-2 border-b border-border/30">
              <span className="text-xs font-medium text-text">Today</span>
            </div>
            <div className="p-4 text-[10px] text-text-muted/30">
              <p>Dashboard content...</p>
              <p className="mt-8">The bar stays until all 8 steps are done, then auto-hides.</p>
            </div>
          </Option>

        </div>
      </div>
    </div>
  );
}
