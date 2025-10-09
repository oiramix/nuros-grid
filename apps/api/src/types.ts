export type VramTier = '8g' | '12g' | '16g_plus';

export interface AgentRegister {
  name: string;
  token?: string;
}

export interface AgentHeartbeat {
  vram_gb: number;
  cuda: string;
  driver: string;
  throughput_hint?: number;
}

export interface JobSpec {
  id: string;
  kind: 'sdxl_turbo' | 'upscale_x4' | 'remove_bg';
  args: Record<string, unknown>;
  inUrls: string[];
  outUrl: string; // for MVP we’ll just store the R2 key as a string
  requiredTier: VramTier;
}
