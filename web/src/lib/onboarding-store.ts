// ── Onboarding session state ──────────────────────────────────────────
// Persists cross-step onboarding data in sessionStorage so it survives
// page navigations but not browser restarts.

const STORAGE_KEY = 'lifeos-onboarding';

export type OnboardingPath = 'managed' | 'byok' | 'own-agent';

export interface OnboardingState {
  /** Which direction the customer chose */
  path: OnboardingPath | null;
  selectedPlanType: string | null;
  anthropicAuthMethod: 'api_key' | 'setup_token';
  anthropicApiKey: string;
  anthropicSetupToken: string;
  telegramToken: string;
  discordToken: string;
  /** Post-paywall personalization */
  persona: string | null;
  mainFocus: string | null;
}

const DEFAULT_STATE: OnboardingState = {
  path: null,
  selectedPlanType: null,
  anthropicAuthMethod: 'setup_token',
  anthropicApiKey: '',
  anthropicSetupToken: '',
  telegramToken: '',
  discordToken: '',
  persona: null,
  mainFocus: null,
};

export function getOnboardingState(): OnboardingState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function setOnboardingState(partial: Partial<OnboardingState>): void {
  if (typeof window === 'undefined') return;
  const current = getOnboardingState();
  const next = { ...current, ...partial };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearOnboardingState(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEY);
}

// ── Dev-mode URL helper ──────────────────────────────────────────────
// Preserves ?dev param across onboarding navigations so developers can
// click through the full flow while already onboarded.

export function onboardingPath(path: string): string {
  if (typeof window === 'undefined') return path;
  const params = new URLSearchParams(window.location.search);
  if (params.has('dev')) {
    return path.includes('?') ? `${path}&dev` : `${path}?dev`;
  }
  return path;
}

// ── Legacy pref helpers ───────────────────────────────────────────────
// The landing page and login page persist plan/billing selection in
// sessionStorage under `pref_plan` / `pref_billing`. These helpers read
// and clear those values.

export function getPrefPlan(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('pref_plan');
}

export function getPrefBilling(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('pref_billing');
}

export function clearPrefs(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('pref_plan');
  sessionStorage.removeItem('pref_billing');
}
