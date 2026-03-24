// Connection states
export type GatewayConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// RPC request/response
export interface GatewayRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

export interface GatewayResponse {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: { message: string; code?: string };
}

// Event frame (server push)
export interface GatewayEvent {
  event: string;
  data: unknown;
}

// Gateway info from health endpoint
export interface GatewayHealth {
  version: string;
  uptime: number;
  status: string;
}

// Channel status
export interface ChannelStatus {
  id: string;
  type: string; // 'telegram' | 'discord' | 'whatsapp' | etc.
  connected: boolean;
  accountName?: string;
  lastActivity?: number;
}

// Session info
export interface SessionInfo {
  key: string;
  agentName: string;
  channel?: string;
  messageCount: number;
  lastActive: number;
}

// Cron job
export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  agentName: string;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
}

// Agent config
export interface AgentConfig {
  name: string;
  model?: string;
  systemPrompt?: string;
}

// Skill info
export interface SkillInfo {
  name: string;
  enabled: boolean;
  description?: string;
}
