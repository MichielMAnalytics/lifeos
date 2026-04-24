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

export const MODELS = [
  { id: "claude", label: "Claude Opus 4.6", icon: "/claude-icon.png" },
  { id: "claude-sonnet", label: "Claude Sonnet 4.6", icon: "/claude-icon.png" },
  { id: "claude-haiku", label: "Claude Haiku 4.5", icon: "/claude-icon.png" },
  { id: "gpt-5.5", label: "GPT-5.5", icon: "/openai-icon.png", iconClass: "dark:invert" },
  { id: "gpt-5.5-pro", label: "GPT-5.5 Pro", icon: "/openai-icon.png", iconClass: "dark:invert", byokOnly: true },
  { id: "gpt", label: "GPT-5.4", icon: "/openai-icon.png", iconClass: "dark:invert" },
  { id: "gpt-5.2", label: "GPT-5.2", icon: "/openai-icon.png", iconClass: "dark:invert" },
  { id: "gpt-mini", label: "GPT-5 Mini", icon: "/openai-icon.png", iconClass: "dark:invert" },
  { id: "gpt-nano", label: "GPT-5 Nano", icon: "/openai-icon.png", iconClass: "dark:invert" },
  { id: "kimi-k2", label: "Kimi K2 Thinking", icon: "/kimi-icon.png" },
  { id: "kimi-k2.5", label: "Kimi K2.5", icon: "/kimi-icon.png", byokOnly: true },
  { id: "kimi-k2-thinking-turbo", label: "Kimi K2 Think Turbo", icon: "/kimi-icon.png", byokOnly: true },
  { id: "kimi-k2-turbo", label: "Kimi K2 Turbo", icon: "/kimi-icon.png", byokOnly: true },
  { id: "gemini-pro", label: "Gemini 3.1 Pro", icon: "/gemini-icon.png" },
  { id: "gemini-flash", label: "Gemini 3 Flash", icon: "/gemini-icon.png" },
  { id: "minimax-m2.1", label: "MiniMax M2.1", icon: "/minimax-icon.png" },
  { id: "minimax-m2.5", label: "MiniMax M2.5", icon: "/minimax-icon.png", byokOnly: true },
  { id: "qwen-coder", label: "Qwen3 Coder 480B", icon: "/qwen-icon.png", platformOnly: true },
  { id: "qwen-235b", label: "Qwen3 235B", icon: "/qwen-icon.png", platformOnly: true },
];
