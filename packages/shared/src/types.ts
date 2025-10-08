export type VramTier = '8g' | '12g' | '16g_plus';


export interface AgentRegister {
name: string; // user alias or hostname
token?: string; // optional registration token
}


export interface AgentHeartbeat {
vram_gb: number;
cuda: string;
driver: string;
throughput_hint?: number; // images/min for SDXL Turbo, etc.
}


export interface JobSpec {
id: string;
kind: 'sdxl_turbo' | 'upscale_x4' | 'remove_bg';
args: Record<string, unknown>;
inUrls: string[];
outUrl: string; // signed PUT URL to R2
requiredTier: VramTier;
}
