// LifeOS theme system — Phase 2 / Section 15 picks (research-backed top palettes).
// Six themes. Defaults to "system" which auto-follows the OS preference.
//
// Each theme provides the same 12 CSS custom properties:
//   bg, bg-subtle, surface, surface-hover, border,
//   text, text-muted,
//   accent, accent-hover, accent-glow,
//   success, warning, danger
//
// "system" is special — it picks Linear Default Dark or GitHub Light based on
// `prefers-color-scheme`. The active resolved theme is what gets applied.

export const themes = {
  // ── 1. Linear Default Dark ─────────────────────────────────
  // The reference standard for modern productivity dark themes.
  'linear-dark': {
    name: 'Linear Default',
    description: 'Near-black with the iconic indigo-violet accent',
    isDark: true,
    colors: {
      bg: '#08090a',
      'bg-subtle': '#0f1011',
      surface: '#141517',
      'surface-hover': '#1c1d1f',
      border: '#23252a',
      text: '#f7f8f8',
      'text-muted': '#8a8f98',
      accent: '#5e6ad2',
      'accent-hover': '#7170ff',
      'accent-glow': 'rgba(94,106,210,0.15)',
      success: '#4cb782',
      warning: '#f2c94c',
      danger: '#eb5757',
    },
  },

  // ── 2. GitHub Light ─────────────────────────────────────────
  // The most widely seen light UI on the developer web.
  'github-light': {
    name: 'GitHub Light',
    description: 'Paper-white with cool neutral grays and a crisp blue accent',
    isDark: false,
    colors: {
      bg: '#ffffff',
      'bg-subtle': '#f6f8fa',
      surface: '#f6f8fa',
      'surface-hover': '#eaeef2',
      border: '#d0d7de',
      text: '#1f2328',
      'text-muted': '#656d76',
      accent: '#0969da',
      'accent-hover': '#0860c7',
      'accent-glow': 'rgba(9,105,218,0.1)',
      success: '#1a7f37',
      warning: '#9a6700',
      danger: '#cf222e',
    },
  },

  // ── 3. GitHub Dark Dimmed ───────────────────────────────────
  // The most popular "gentle dark" theme — easier on the eyes for long sessions.
  'github-dark-dimmed': {
    name: 'GitHub Dark Dimmed',
    description: 'Slate-blue dimmed dark for long-session comfort',
    isDark: true,
    colors: {
      bg: '#22272e',
      'bg-subtle': '#2d333b',
      surface: '#2d333b',
      'surface-hover': '#373e47',
      border: '#444c56',
      text: '#adbac7',
      'text-muted': '#768390',
      accent: '#539bf5',
      'accent-hover': '#6cb6ff',
      'accent-glow': 'rgba(83,155,245,0.15)',
      success: '#57ab5a',
      warning: '#c69026',
      danger: '#e5534b',
    },
  },

  // ── 4. Notion Light ─────────────────────────────────────────
  // The defining warm light theme for docs and productivity.
  'notion-light': {
    name: 'Notion Light',
    description: 'Off-white paper with warm neutrals and a soft blue accent',
    isDark: false,
    colors: {
      bg: '#ffffff',
      'bg-subtle': '#fbfbfa',
      surface: '#f7f6f3',
      'surface-hover': '#efefed',
      border: '#e3e2de',
      text: '#37352f',
      'text-muted': '#787774',
      accent: '#2383e2',
      'accent-hover': '#1a73d1',
      'accent-glow': 'rgba(35,131,226,0.08)',
      success: '#4dab9a',
      warning: '#cb912f',
      danger: '#e03e3e',
    },
  },

  // ── 5. iA Writer / Solarized Light ─────────────────────────
  // The canonical "writer's theme" — cream paper, sepia text, amber accent.
  'ia-writer': {
    name: 'iA Writer',
    description: "Cream paper, sepia text, amber accent — the writer's theme",
    isDark: false,
    colors: {
      bg: '#fdf6e3',
      'bg-subtle': '#f5eedb',
      surface: '#ffffff',
      'surface-hover': '#eee8d5',
      border: '#e4dcc1',
      text: '#373129',
      'text-muted': '#93a1a1',
      accent: '#b58900',
      'accent-hover': '#9c7500',
      'accent-glow': 'rgba(181,137,0,0.12)',
      success: '#859900',
      warning: '#cb4b16',
      danger: '#dc322f',
    },
  },
} as const;

export type ThemeKey = keyof typeof themes | 'system';
export const defaultTheme: ThemeKey = 'system';
export const themeKeys: ThemeKey[] = [
  'system',
  'linear-dark',
  'github-light',
  'github-dark-dimmed',
  'notion-light',
  'ia-writer',
];

// Defaults used by "system" mode based on prefers-color-scheme.
export const SYSTEM_DARK_THEME: keyof typeof themes = 'linear-dark';
export const SYSTEM_LIGHT_THEME: keyof typeof themes = 'github-light';

export const systemThemeEntry = {
  name: 'System',
  description: 'Follows your OS dark/light preference',
  isDark: true,
  colors: themes[SYSTEM_DARK_THEME].colors,
};

/**
 * Resolve the actual theme key to apply when the user picks "system".
 * Falls back to dark if the platform doesn't expose prefers-color-scheme.
 */
export function resolveSystemTheme(): keyof typeof themes {
  if (typeof window === 'undefined') return SYSTEM_DARK_THEME;
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  return prefersLight ? SYSTEM_LIGHT_THEME : SYSTEM_DARK_THEME;
}
