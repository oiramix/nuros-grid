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
  const id = crypto.randomUUID();
  const outKey = `results/${id}.zip`; // where agent would upload in the future

  const job: JobSpec = {
    id,
    kind: (body.kind as any) ?? 'upscale_x4',
    args: body.args ?? {},
    inUrls: body.inUrls ?? [],
    outUrl: outKey,             // store plain R2 key (simple for MVP)
    requiredTier: '8g',
  };

  const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);

  // enqueue job (LPUSH + agent does RPOP => FIFO)
  await redis.lpush(c.env.QUEUE_NAME, job);

  // track status in hash: job:<id>
  await redis.hset(`job:${id}`, {
    status: 'queued',
    outKey,
    createdAt: new Date().toISOString(),
  });

  return c.json({ id });
});

// Get job status (polled by the UI)
jobs.get('/:id/status', async (c) => {
  const { id } = c.req.param();
  const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);

  const arr = await redis.hgetall(`job:${id}`); // flat array
  if (!arr.length) return c.json({ status: 'unknown' });

  const obj: Record<string, string> = {};
  for (let i = 0; i < arr.length; i += 2) obj[arr[i]] = arr[i + 1];

  return c.json(obj);
});

// Finalize (agent calls when done) – for now just mark done and echo outUrl if provided
jobs.post('/:id/finalize', async (c) => {
  const { id } = c.req.param();
  const body = (await c.req.json().catch(() => ({}))) as { outUrl?: string };

  const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
  await redis.hset(`job:${id}`, {
    status: 'done',
    result: body?.outUrl ?? '',
    finishedAt: new Date().toISOString(),
  });

  return c.json({ ok: true });
});

export default jobs;
