// apps/api/src/routes/agents.ts
import { Hono } from 'hono';
import type { AgentRegister, AgentHeartbeat, JobSpec } from '../types';
import { Redis } from '../redis';

export const agents = new Hono<{ Bindings: Env }>();

type Env = {
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  R2: R2Bucket;
  QUEUE_NAME: string;
  AGENT_ADMIN_KEY: string;
};

// Admin registers a new agent, returns an agent API key
agents.post('/register', async (c) => {
  const _body = (await c.req.json()) as AgentRegister;
  const adminKey = c.req.header('x-admin-key');
  if (adminKey !== c.env.AGENT_ADMIN_KEY) return c.text('forbidden', 403);

  // MVP: generate a random key (no storage yet)
  const key = crypto.randomUUID().replace(/-/g, '');
  return c.json({ agentKey: key, minVersion: '0.1.0' });
});

// Agent heartbeat (we can ignore details for MVP)
agents.post('/heartbeat', async (c) => {
  const key = c.req.header('x-api-key');
  if (!key) return c.text('missing key', 401);
  const _hb = (await c.req.json()) as AgentHeartbeat;
  return c.json({ ok: true });
});

// Agent claims next job
agents.post('/claim', async (c) => {
  const key = c.req.header('x-api-key');
  if (!key) return c.text('missing key', 401);

  const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);

  // Pop from the queue (RPOP = FIFO with LPUSH)
  const job = await redis.rpop<JobSpec>(c.env.QUEUE_NAME);
  if (!job) return c.body(null, 204);

  // Mark status -> processing
  await redis.call('HSET', [`job:${job.id}`, 'status', 'processing']);

  return c.json(job);
});

export default agents;
