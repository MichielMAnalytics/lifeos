export type DeploymentStatus =
  | "provisioning"
  | "starting"
  | "running"
  | "error"
  | "deactivating"
  | "deactivated"
  | "suspended";

export const CHANNELS = [
  { id: "telegram", label: "Telegram", icon: "/telegram-icon.png", tokenPlaceholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" },
  { id: "discord", label: "Discord", icon: "/discord-icon.png", tokenPlaceholder: "MTIzNDU2Nzg5MDEyMzQ1Njc4OQ..." },
  { id: "whatsapp", label: "WhatsApp", icon: "/whatsapp-icon.png", cockpitOnly: true },
] as const;

// `provider` is the column the Settings model picker groups on. Order
// inside each provider is the order rendered. Drop a model from this
// list to retire it from the UI. The platform pod (k8s.ts /
// buildOpenClawConfig) still configures Moonshot/Google/MiniMax/Qwen
// providers internally, so any user-selected model that's no longer
// here gets MODEL_REF_MAP's "claude" fallback on next pod restart —
// they don't crash, they just default back. We can drop those provider
// blocks from the platform config too in a follow-up once we're sure
// nobody's still pinned to one.
export const MODELS = [
  // ── Anthropic ──
  { id: "claude", label: "Opus 4.6", provider: "Anthropic", icon: "/claude-icon.png" },
  { id: "claude-sonnet", label: "Sonnet 4.6", provider: "Anthropic", icon: "/claude-icon.png" },
  { id: "claude-haiku", label: "Haiku 4.5", provider: "Anthropic", icon: "/claude-icon.png" },
  // ── OpenAI ──
  { id: "gpt-5.5", label: "GPT-5.5", provider: "OpenAI", icon: "/openai-icon.png", iconClass: "dark:invert" },
  { id: "gpt", label: "GPT-5.4", provider: "OpenAI", icon: "/openai-icon.png", iconClass: "dark:invert" },
  { id: "gpt-5.2", label: "GPT-5.2", provider: "OpenAI", icon: "/openai-icon.png", iconClass: "dark:invert" },
  { id: "gpt-mini", label: "GPT-5 Mini", provider: "OpenAI", icon: "/openai-icon.png", iconClass: "dark:invert" },
  { id: "gpt-nano", label: "GPT-5 Nano", provider: "OpenAI", icon: "/openai-icon.png", iconClass: "dark:invert" },
];

// Render order — keep in sync with the providers used above.
export const MODEL_PROVIDER_ORDER = [
  "Anthropic",
  "OpenAI",
] as const;
