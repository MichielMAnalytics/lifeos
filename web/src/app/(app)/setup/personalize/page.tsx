'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/lib/convex-api';
import { SoftGlow } from '@/components/onboarding/soft-glow';
import { getOnboardingState } from '@/lib/onboarding-store';

// ── Step definitions ─────────────────────────────────

interface Step {
  key: string;
  question: string;
  type: 'text' | 'chips' | 'multi-chips' | 'cards';
  options?: { key: string; label: string; subtitle?: string }[];
  placeholder?: string;
  prefill?: string;
  /** Micro-insight shown before the question (7C pattern) */
  insight?: string;
}

const STEPS: Step[] = [
  {
    key: 'displayName',
    question: "What should I call you?",
    type: 'text',
    placeholder: 'Your name...',
  },
  {
    key: 'topGoals',
    question: "What are you working towards right now?",
    type: 'multi-chips',
    options: [
      { key: 'launch-product', label: 'Launch a product' },
      { key: 'get-healthier', label: 'Get healthier' },
      { key: 'build-habits', label: 'Build better habits' },
      { key: 'grow-career', label: 'Grow my career' },
      { key: 'learn-skills', label: 'Learn new skills' },
      { key: 'stay-organized', label: 'Stay organized' },
      { key: 'work-life-balance', label: 'Work-life balance' },
      { key: 'save-money', label: 'Save money' },
    ],
  },
  {
    key: 'focusAreas',
    insight: "People who narrow their focus to 2-3 areas make 3x more progress than those who try to improve everything at once.",
    question: "Which parts of your life matter most right now?",
    type: 'multi-chips',
    options: [
      { key: 'career', label: 'Career' },
      { key: 'health', label: 'Health' },
      { key: 'relationships', label: 'Relationships' },
      { key: 'finances', label: 'Finances' },
      { key: 'personal-growth', label: 'Personal growth' },
      { key: 'creativity', label: 'Creativity' },
      { key: 'learning', label: 'Learning' },
    ],
  },
  {
    key: 'communicationTone',
    question: "How would you like me to communicate?",
    type: 'cards',
    options: [
      { key: 'direct', label: 'Direct', subtitle: 'No fluff, just action items' },
      { key: 'warm', label: 'Warm', subtitle: 'Encouraging and supportive' },
      { key: 'casual', label: 'Casual', subtitle: 'Like talking to a friend' },
      { key: 'structured', label: 'Structured', subtitle: 'Organized and methodical' },
    ],
  },
  {
    key: 'biggestChallenge',
    insight: "Knowing your patterns is the first step to changing them. Most people share 2-3 of these.",
    question: "What do you struggle with the most?",
    type: 'multi-chips',
    options: [
      { key: 'not-finishing', label: 'Not finishing things' },
      { key: 'procrastination', label: 'Procrastination' },
      { key: 'overwhelm', label: 'Feeling overwhelmed' },
      { key: 'consistency', label: 'Staying consistent' },
      { key: 'prioritizing', label: 'Prioritizing tasks' },
      { key: 'focus', label: 'Staying focused' },
      { key: 'planning', label: 'Planning ahead' },
    ],
  },
  {
    key: 'accountabilityStyle',
    insight: "The right accountability style can double your follow-through rate.",
    question: "How should I hold you accountable?",
    type: 'cards',
    options: [
      { key: 'gentle', label: 'Gentle nudges', subtitle: 'Reminders without pressure' },
      { key: 'firm', label: 'Firm deadlines', subtitle: 'Hold me to my commitments' },
      { key: 'track-only', label: 'Just track', subtitle: 'Show me the data, no pushing' },
    ],
  },
];

// ── Chat bubble component ────────────────────────────

function BotBubble({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [visible, setVisible] = useState(delay === 0);

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  if (!visible) {
    return (
      <div className="flex justify-start mb-2">
        <div className="rounded-xl rounded-tl-sm bg-[#212d3b] px-4 py-2.5 max-w-[85%]">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-bounce [animation-delay:0ms]" />
            <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-bounce [animation-delay:150ms]" />
            <div className="w-1.5 h-1.5 rounded-full bg-text-muted/40 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-2 animate-fade-in">
      <div className="rounded-xl rounded-tl-sm bg-[#212d3b] px-4 py-2.5 max-w-[85%]">
        <p className="text-sm text-[#f5f5f5] leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end mb-2 animate-fade-in">
      <div className="rounded-xl rounded-tr-sm bg-[#2b5278] px-4 py-2.5 max-w-[85%]">
        <p className="text-sm text-[#f5f5f5] leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

// ── Input components ─────────────────────────────────

function TextInput({ placeholder, onSubmit, defaultValue }: { placeholder?: string; onSubmit: (value: string) => void; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex gap-2 animate-fade-in">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onSubmit(value.trim());
        }}
        placeholder={placeholder}
        className="flex-1 rounded-xl border border-border/60 bg-surface/30 px-4 py-3 text-sm text-text placeholder:text-text-muted/50 focus:border-accent/50 focus:outline-none transition-colors"
      />
      <button
        onClick={() => { if (value.trim()) onSubmit(value.trim()); }}
        disabled={!value.trim()}
        className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-bg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}

function ChipSelect({ options, onSelect }: { options: { key: string; label: string }[]; onSelect: (key: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 animate-fade-in">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onSelect(opt.key)}
          className="rounded-full border-2 border-border/50 bg-surface/20 px-4 py-2 text-sm text-text font-medium transition-all hover:border-accent hover:bg-accent/[0.05] active:scale-[0.97]"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MultiChipSelect({ options, onSubmit }: { options: { key: string; label: string }[]; onSubmit: (keys: string[]) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const customRef = useRef<HTMLInputElement>(null);

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleSubmit() {
    const result = Array.from(selected);
    if (customValue.trim()) result.push(customValue.trim());
    if (result.length > 0) onSubmit(result);
  }

  useEffect(() => {
    if (showCustom) customRef.current?.focus();
  }, [showCustom]);

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.has(opt.key);
          return (
            <button
              key={opt.key}
              onClick={() => toggle(opt.key)}
              className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
                isSelected
                  ? 'border-accent bg-accent/10 text-text'
                  : 'border-border/50 bg-surface/20 text-text hover:border-border hover:bg-surface/40'
              }`}
            >
              {isSelected && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5 -mt-0.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {opt.label}
            </button>
          );
        })}
        <button
          onClick={() => setShowCustom(true)}
          className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
            showCustom
              ? 'border-accent bg-accent/10 text-text'
              : 'border-border/50 border-dashed bg-surface/10 text-text-muted hover:border-border hover:text-text'
          }`}
        >
          + Something else
        </button>
      </div>
      {showCustom && (
        <input
          ref={customRef}
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder="Type your own..."
          className="w-full rounded-xl border border-border/60 bg-surface/30 px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:border-accent/50 focus:outline-none transition-colors"
        />
      )}
      <button
        onClick={handleSubmit}
        disabled={selected.size === 0 && !customValue.trim()}
        className="rounded-xl bg-accent px-6 py-2.5 text-sm font-medium text-bg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}

function CardSelect({ options, onSelect }: { options: { key: string; label: string; subtitle?: string }[]; onSelect: (key: string) => void }) {
  return (
    <div className={`grid gap-2 animate-fade-in ${options.length <= 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onSelect(opt.key)}
          className="rounded-2xl border-2 border-border/50 bg-surface/10 px-4 py-4 text-center transition-all hover:border-accent hover:bg-accent/[0.05] active:scale-[0.97]"
        >
          <span className="block text-sm font-semibold text-text">{opt.label}</span>
          {opt.subtitle && (
            <span className="block mt-1 text-[11px] text-text-muted/70">{opt.subtitle}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Helper to format answer for display ──────────────

function formatAnswer(step: Step, value: string | string[]): string {
  if (Array.isArray(value)) {
    return value.map(v => {
      const opt = step.options?.find(o => o.key === v);
      return opt?.label ?? v;
    }).join(', ');
  }
  const opt = step.options?.find(o => o.key === value);
  return opt?.label ?? value;
}

// ── Main component ───────────────────────────────────

export default function PersonalizePage() {
  const router = useRouter();
  const saveProfile = useMutation(api.userProfile.save);
  const user = useQuery(api.authHelpers.getMe, {});

  // Filter steps based on what we already know
  const activeSteps = useMemo(() => {
    const steps = [...STEPS];
    // Skip name question if we already have it from auth
    if (user?.name) {
      const idx = steps.findIndex(s => s.key === 'displayName');
      if (idx !== -1) steps.splice(idx, 1);
    }
    return steps;
  }, [user?.name]);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    // Pre-fill from auth + onboarding state
    const initial: Record<string, string | string[]> = {};
    if (typeof window !== 'undefined') {
      const state = getOnboardingState();
      if (state.selectedUseCases.length > 0) {
        // Map use case keys to focus areas where possible
        initial.topGoals = state.selectedUseCases;
      }
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentStep]);

  function handleAnswer(stepKey: string, value: string | string[]) {
    setAnswers(prev => ({ ...prev, [stepKey]: value }));
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finishSetup({ ...answers, [stepKey]: value });
    }
  }

  async function finishSetup(finalAnswers: Record<string, string | string[]>) {
    setSaving(true);
    try {
      await saveProfile({
        displayName: (finalAnswers.displayName as string | undefined) ?? user?.name ?? undefined,
        topGoals: finalAnswers.topGoals as string[] | undefined,
        focusAreas: finalAnswers.focusAreas as string[] | undefined,
        communicationTone: finalAnswers.communicationTone as string | undefined,
        biggestChallenge: finalAnswers.biggestChallenge as string[] | string | undefined,
        accountabilityStyle: finalAnswers.accountabilityStyle as string | undefined,
        setupCompleted: true,
      });
      localStorage.setItem('lifeos-setup-complete', 'true');
      router.replace('/life-coach');
    } catch (err) {
      console.error('Failed to save profile:', err);
      setSaving(false);
    }
  }

  function handleSkip() {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finishSetup(answers);
    }
  }

  const progress = saving
    ? 100
    : Math.round(((currentStep) / activeSteps.length) * 100);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg">

      {/* Progress bar (Typeform-style) */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-border/20">
        <div
          className="h-full bg-accent transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Back */}
      <div className="fixed top-4 left-6 z-50">
        <button
          onClick={() => router.push('/setup/connect')}
          className="group flex items-center gap-2 text-xs text-text-muted hover:text-text transition-all duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
      </div>

      {/* Step count */}
      <div className="fixed top-4 right-6 z-50 text-[11px] text-text-muted/40">
        {Math.min(currentStep + 1, activeSteps.length)} of {activeSteps.length}
      </div>

      <div className="min-h-screen flex flex-col items-center justify-end px-4 pt-12 pb-6">
        <div className="w-full max-w-lg flex flex-col flex-1">
          {/* Chat history */}
          <div className="flex-1 space-y-1 mb-4 overflow-y-auto px-1">
            {/* Initial greeting */}
            <BotBubble>
              Hey{user?.name ? ` ${user.name.split(' ')[0]}` : ''}! I&apos;m your Life Coach. Let me get to know you so I can help you better.
            </BotBubble>

            {/* Completed steps */}
            {activeSteps.slice(0, currentStep).map((step, i) => (
              <div key={step.key}>
                <BotBubble>{step.question}</BotBubble>
                {answers[step.key] !== undefined && (
                  <UserBubble>{formatAnswer(step, answers[step.key])}</UserBubble>
                )}
              </div>
            ))}

            {/* Micro-insight + current step question */}
            {currentStep < activeSteps.length && !saving && activeSteps[currentStep].insight && (
              <div className="flex justify-start mb-2 animate-fade-in">
                <div className="rounded-lg bg-accent/10 border border-accent/20 px-3 py-2 max-w-[85%]">
                  <p className="text-[11px] text-accent/80 leading-relaxed">{activeSteps[currentStep].insight}</p>
                </div>
              </div>
            )}
            {currentStep < activeSteps.length && !saving && (
              <BotBubble delay={activeSteps[currentStep].insight ? 600 : 300}>
                {activeSteps[currentStep].question}
              </BotBubble>
            )}

            {/* Saving state */}
            {saving && (
              <>
                <BotBubble delay={200}>
                  Perfect. I&apos;ve got everything I need.
                </BotBubble>
                <BotBubble delay={800}>
                  Let&apos;s get started &mdash; I&apos;ll be ready for you in a moment.
                </BotBubble>
              </>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Current input */}
          {currentStep < activeSteps.length && !saving && (
            <div className="pb-4">
              {activeSteps[currentStep].type === 'text' && (
                <TextInput
                  key={activeSteps[currentStep].key}
                  placeholder={activeSteps[currentStep].placeholder}
                  defaultValue={
                    activeSteps[currentStep].key === 'displayName'
                      ? (answers.displayName as string) ?? user?.name ?? ''
                      : ''
                  }
                  onSubmit={(value) => handleAnswer(activeSteps[currentStep].key, value)}
                />
              )}
              {activeSteps[currentStep].type === 'chips' && (
                <ChipSelect
                  options={activeSteps[currentStep].options!}
                  onSelect={(key) => handleAnswer(activeSteps[currentStep].key, key)}
                />
              )}
              {activeSteps[currentStep].type === 'multi-chips' && (
                <MultiChipSelect
                  key={activeSteps[currentStep].key}
                  options={activeSteps[currentStep].options!}
                  onSubmit={(keys) => handleAnswer(activeSteps[currentStep].key, keys)}
                />
              )}
              {activeSteps[currentStep].type === 'cards' && (
                <CardSelect
                  options={activeSteps[currentStep].options!}
                  onSelect={(key) => handleAnswer(activeSteps[currentStep].key, key)}
                />
              )}

              <button
                onClick={handleSkip}
                className="mt-3 text-xs text-text-muted/50 hover:text-text-muted transition-colors w-full text-center"
              >
                Skip this question
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
