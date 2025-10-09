// apps/api/src/routes/jobs.ts
import { Hono } from 'hono';
import type { JobSpec } from '../types';
import { Redis } from '../redis';

export const jobs = new Hono<{ Bindings: Env }>();

type Env = {
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  R2: R2Bucket;        // reserved for uploads later
  QUEUE_NAME: string;  // e.g. "jobs:sdxl_turbo"
};

// Create a job (buyer submits)
jobs.post('/create', async (c) => {
  const body = (await c.req.json()) as Partial<JobSpec> & { inUrls?: string[] };

  // minimal validation
  const inUrls = (body.inUrls ?? []).filter(Boolean);
  if (inUrls.length === 0) {
    return c.json({ error: 'inUrls[] is required' }, 400);
  }

  const id = crypto.randomUUID();
  const outKey = `results/${id}.zip`;

  const job: JobSpec = {
    id,
    kind: (body.kind as any) ?? 'upscale_x4',
    args: body.args ?? {},
    inUrls,
    outUrl: outKey,        // for MVP: just the R2 key string
    requiredTier: '8g',
  };

  const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
  const queue = c.env.QUEUE_NAME || 'jobs:sdxl_turbo';

  // enqueue for agent (LPUSH + agent RPOP = FIFO)
  await redis.lpush(queue, job);

  // track status in job hash
  await redis.call('HSET', [
    `job:${id}`,
    'status', 'queued',
    'outKey', outKey,
    'createdAt', new Date().toISOString(),
  ]);

  return c.json({ id });
});

// Get job status (polled by UI)
jobs.get('/:id/status', async (c) => {
  const { id } = c.req.param();
  const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);

  // Upstash REST returns { result: ["field","value", ...] }
  const res: any = await redis.call('HGETALL', [`job:${id}`]);
  const arr: string[] = res?.result ?? [];

  if (!arr.length) return c.json({ status: 'unknown' });

  const obj: Record<string, string> = {};
  for (let i = 0; i < arr.length; i += 2) obj[arr[i]] = arr[i + 1];

  // Make sure browsers/CDN never cache this
  return c.json(obj, 200, { 'Cache-Control': 'no-store' });
});

// Finalize (agent calls when done)
// Body: { outUrl?: string }
jobs.post('/:id/finalize', async (c) => {
  const { id } = c.req.param();
  const body = (await c.req.json().catch(() => ({}))) as { outUrl?: string };

  const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
  await redis.call('HSET', [
    `job:${id}`,
    'status', 'done',
    'result', body?.outUrl ?? '',
    'finishedAt', new Date().toISOString(),
  ]);

  return c.json({ ok: true });
});

export default jobs;
