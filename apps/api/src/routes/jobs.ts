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


// Create a job (buyer submits)
jobs.post('/create', async (c) => {
  const body = (await c.req.json()) as Partial<JobSpec> & { inUrls?: string[] };
  const id = crypto.randomUUID();
  const key = `results/${id}.zip`; // agent will upload to this later (we'll switch to signed URLs soon)

  const job: JobSpec = {
    id,
    kind: (body.kind as any) ?? 'upscale_x4',
    args: body.args ?? {},
    inUrls: body.inUrls ?? [],
    outUrl: key,
    requiredTier: '8g',
  };

  const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
  await redis.lpush(c.env.QUEUE_NAME, job);
  await redis.call("HSET", [`job:${id}`, "status", "queued", "outKey", key]);
  return c.json({ id });
});



// Finalize multipart upload (agent calls when done)
jobs.post('/:id/finalize', async (c) => {
  return c.json({ ok: true });
});


export default jobs;
