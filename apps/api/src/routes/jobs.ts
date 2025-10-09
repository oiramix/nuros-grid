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


// Create a job (buyer submits). In MVP, anonymous allowed.
jobs.post('/create', async (c) => {
const body = (await c.req.json()) as Partial<JobSpec> & { inUrls?: string[] };
const id = crypto.randomUUID();


// Create a signed PUT URL for result
const key = `results/${id}.zip`;
const put = await c.env.R2.createMultipartUpload(key);
// For MVP, we expose an uploadId + part method; agent can also PUT directly via the R2 API if preferred.


const job: JobSpec = {
id,
kind: (body.kind as any) ?? 'upscale_x4',
args: body.args ?? {},
inUrls: body.inUrls ?? [],
outUrl: JSON.stringify({ key, uploadId: put.uploadId }),
requiredTier: '8g',
};


const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
await redis.lpush(c.env.QUEUE_NAME, job);
return c.json({ id });
});


// Finalize multipart upload (agent calls when done)
jobs.post('/:id/finalize', async (c) => {
const { id } = c.req.param();
const { key, uploadId, parts } = (await c.req.json()) as { key: string; uploadId: string; parts: { partNumber: number; etag: string }[] };
await c.env.R2.completeMultipartUpload(key, uploadId, { parts });
return c.json({ ok: true });
});


export default jobs;
