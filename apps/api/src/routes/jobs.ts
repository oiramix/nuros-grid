// apps/api/src/routes/jobs.ts
import { Hono } from 'hono';
import type { JobSpec } from '../types';
import { Redis } from '../redis';

export const jobs = new Hono<{ Bindings: Env }>();

type Env = {
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  R2: R2Bucket;
  QUEUE_NAME: string;
};

function rid() {
  // lightweight request id
  return Math.random().toString(36).slice(2, 10);
}

// ---------- DEBUG ENDPOINTS (temporary) ----------
jobs.get('/debug/env', (c) => {
  const id = rid();
  const url = c.env.UPSTASH_REDIS_REST_URL ?? '';
  const token = c.env.UPSTASH_REDIS_REST_TOKEN ?? '';

  const masked = (s: string) =>
    s.length <= 8 ? s : `${s.slice(0, 6)}…${s.slice(-4)}`;

  const data = {
    QUEUE_NAME: c.env.QUEUE_NAME || '(empty)',
    UPSTASH_REDIS_REST_URL: masked(url),
    UPSTASH_REDIS_REST_TOKEN: masked(token),
  };
  console.log(`[${id}] /debug/env ->`, data);
  return c.json(data, 200, { 'Cache-Control': 'no-store', 'x-request-id': id });
});

jobs.get('/debug/job/:id/raw', async (c) => {
  const id = rid();
  const { id: jobId } = c.req.param();
  console.log(`[${id}] /debug/job/${jobId}/raw START`);
  try {
    const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
    const res: any = await redis.call('HGETALL', [`job:${jobId}`]);
    console.log(`[${id}] /debug/job/${jobId}/raw RES:`, res);
    return c.json({ raw: res }, 200, { 'Cache-Control': 'no-store', 'x-request-id': id });
  } catch (e: any) {
    console.error(`[${id}] /debug/job/${jobId}/raw ERR:`, e?.stack || e);
    return c.json({ error: String(e) }, 500, { 'x-request-id': id });
  }
});
// --------------------------------------------------

// Create a job (buyer submits)
jobs.post('/create', async (c) => {
  const id = rid();
  console.log(`[${id}] /jobs/create START`);
  try {
    const body = (await c.req.json()) as Partial<JobSpec> & { inUrls?: string[] };
    console.log(`[${id}] body:`, body);

    const inUrls = (body.inUrls ?? []).filter(Boolean);
    if (inUrls.length === 0) {
      console.warn(`[${id}] no inUrls provided`);
      return c.json({ error: 'inUrls[] is required' }, 400, { 'x-request-id': id });
    }

    const jobId = crypto.randomUUID();
    const outKey = `results/${jobId}.zip`;

    const job: JobSpec = {
      id: jobId,
      kind: (body.kind as any) ?? 'upscale_x4',
      args: body.args ?? {},
      inUrls,
      outUrl: outKey,
      requiredTier: '8g',
    };

    const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
    const queue = c.env.QUEUE_NAME || 'jobs:sdxl_turbo';

    console.log(`[${id}] LPUSH ${queue} job.id=${jobId}`);
    await redis.lpush(queue, job);

    console.log(`[${id}] HSET job:${jobId} status=queued outKey=${outKey}`);
    await redis.call('HSET', [
      `job:${jobId}`,
      'status', 'queued',
      'outKey', outKey,
      'createdAt', new Date().toISOString(),
    ]);

    console.log(`[${id}] /jobs/create OK id=${jobId}`);
    return c.json({ id: jobId }, 200, { 'x-request-id': id });
  } catch (e: any) {
    console.error(`[${id}] /jobs/create ERR:`, e?.stack || e);
    return c.json({ error: String(e) }, 500, { 'x-request-id': id });
  }
});

// Get job status (polled by UI)
jobs.get('/:id/status', async (c) => {
  const id = rid();
  const { id: jobId } = c.req.param();
  console.log(`[${id}] /jobs/${jobId}/status START`);
  try {
    const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
    const res: any = await redis.call('HGETALL', [`job:${jobId}`]);

    const arr: string[] = res?.result ?? [];
    if (!arr.length) {
      console.warn(`[${id}] job:${jobId} -> unknown`);
      return c.json({ status: 'unknown' }, 200, {
        'Cache-Control': 'no-store',
        'x-request-id': id,
      });
    }

    const obj: Record<string, string> = {};
    for (let i = 0; i < arr.length; i += 2) obj[arr[i]] = arr[i + 1];

    console.log(`[${id}] job:${jobId} ->`, obj);
    return c.json(obj, 200, { 'Cache-Control': 'no-store', 'x-request-id': id });
  } catch (e: any) {
    console.error(`[${id}] /jobs/${jobId}/status ERR:`, e?.stack || e);
    return c.json({ error: String(e) }, 500, { 'x-request-id': id });
  }
});

// Finalize (agent calls when done)
jobs.post('/:id/finalize', async (c) => {
  const id = rid();
  const { id: jobId } = c.req.param();
  console.log(`[${id}] /jobs/${jobId}/finalize START`);
  try {
    const body = (await c.req.json().catch(() => ({}))) as { outUrl?: string };

    const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
    console.log(`[${id}] HSET job:${jobId} status=done result=${body?.outUrl ?? ''}`);
    await redis.call('HSET', [
      `job:${jobId}`,
      'status', 'done',
      'result', body?.outUrl ?? '',
      'finishedAt', new Date().toISOString(),
    ]);

    console.log(`[${id}] /jobs/${jobId}/finalize OK`);
    return c.json({ ok: true }, 200, { 'x-request-id': id });
  } catch (e: any) {
    console.error(`[${id}] /jobs/${jobId}/finalize ERR:`, e?.stack || e);
    return c.json({ error: String(e) }, 500, { 'x-request-id': id });
  }
});

export default jobs;
