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
// list (and from MODEL_REF_MAP / buildOpenClawConfig) to retire it.
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
  // ── Moonshot (Kimi) ──
  { id: "kimi-k2", label: "K2 Thinking", provider: "Moonshot", icon: "/kimi-icon.png" },
  { id: "kimi-k2.5", label: "K2.5", provider: "Moonshot", icon: "/kimi-icon.png", byokOnly: true },
  { id: "kimi-k2-thinking-turbo", label: "K2 Thinking Turbo", provider: "Moonshot", icon: "/kimi-icon.png", byokOnly: true },
  { id: "kimi-k2-turbo", label: "K2 Turbo", provider: "Moonshot", icon: "/kimi-icon.png", byokOnly: true },
  // ── Google ──
  { id: "gemini-pro", label: "Gemini 3.1 Pro", provider: "Google", icon: "/gemini-icon.png" },
  { id: "gemini-flash", label: "Gemini 3 Flash", provider: "Google", icon: "/gemini-icon.png" },
  // ── MiniMax ──
  { id: "minimax-m2.1", label: "M2.1", provider: "MiniMax", icon: "/minimax-icon.png" },
  { id: "minimax-m2.5", label: "M2.5", provider: "MiniMax", icon: "/minimax-icon.png", byokOnly: true },
  // ── Alibaba (Qwen) ──
  { id: "qwen-coder", label: "Qwen3 Coder 480B", provider: "Alibaba", icon: "/qwen-icon.png", platformOnly: true },
  { id: "qwen-235b", label: "Qwen3 235B", provider: "Alibaba", icon: "/qwen-icon.png", platformOnly: true },
];

// Render order — keep in sync with the providers used above.
export const MODEL_PROVIDER_ORDER = [
  "Anthropic",
  "OpenAI",
  "Moonshot",
  "Google",
  "MiniMax",
  "Alibaba",
] as const;
