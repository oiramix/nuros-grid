// apps/api/src/routes/jobs.ts
import { Hono } from 'hono';
import type { JobSpec } from '../types';
import { Redis } from '../redis';

export const jobs = new Hono<{ Bindings: Env }>();

type Env = {
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  R2: R2Bucket;        // not used yet, but will be for uploads
  QUEUE_NAME: string;  // e.g. "jobs:sdxl_turbo"
};

// Create a job (buyer submits)
jobs.post('/create', async (c) => {
  const body = (await c.req.json()) as Partial<JobSpec> & { inUrls?: string[] };
  const id = crypto.randomUUID();
  const key = `results/${id}.zip`; // where the agent/API will upload output

  const job: JobSpec = {
    id,
    kind: (body.kind as any) ?? 'upscale_x4',
    args: body.args ?? {},
    inUrls: body.inUrls ?? [],
    outUrl: key,
    requiredTier: '8g',
  };

  const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);

  // enqueue job
  await redis.lpush(c.env.QUEUE_NAME, job);

  // track status in a hash: job:<id>
  await redis.call('HSET', [`job:${id}`, 'status', 'queued', 'outKey', key]);

  return c.json({ id });
});

// Get job status (polled by the UI)
jobs.get('/:id/status', async (c) => {
  const { id } = c.req.param();
  const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);

  // Upstash REST returns { result: ["field","value", ...] }
  const res: any = await redis.call('HGETALL', [`job:${id}`]);
  const arr: string[] = res?.result ?? [];

  const obj: Record<string, string> = {};
  for (let i = 0; i < arr.length; i += 2) obj[arr[i]] = arr[i + 1];

  // if nothing, report unknown
  if (!arr.length) return c.json({ status: 'unknown' });
  return c.json(obj);
});

// Finalize (agent calls when done) – for now just mark done and echo outUrl
jobs.post('/:id/finalize', async (c) => {
  const { id } = c.req.param();
  const body = (await c.req.json().catch(() => ({}))) as { outUrl?: string };

  const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
  await redis.call('HSET', [`job:${id}`, 'status', 'done', 'result', body?.outUrl ?? '']);

  return c.json({ ok: true });
});

export default jobs;
