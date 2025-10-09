import { Hono } from 'hono';
import type { AgentRegister, AgentHeartbeat, JobSpec } from '../types';
import { Redis } from '../redis';


export const agents = new Hono<{ Bindings: Env }>();


type Env = {
UPSTASH_REDIS_REST_URL: string;
UPSTASH_REDIS_REST_TOKEN: string;
R2: R2Bucket;
QUEUE_NAME: string;
};


agents.post('/register', async (c) => {
const body = (await c.req.json()) as AgentRegister;
const adminKey = c.req.header('x-admin-key');
if (adminKey !== c.env.AGENT_ADMIN_KEY) return c.text('forbidden', 403);
// In MVP, generate an API key and return
const key = crypto.randomUUID().replace(/-/g, '');
// TODO: persist to D1/Postgres; here we just return
return c.json({ agentKey: key, minVersion: '0.1.0' });
});


agents.post('/heartbeat', async (c) => {
const key = c.req.header('x-api-key');
if (!key) return c.text('missing key', 401);
const hb = (await c.req.json()) as AgentHeartbeat;
// TODO: store heartbeat in KV/D1
return c.json({ ok: true });
});


agents.post('/claim', async (c) => {
const key = c.req.header('x-api-key');
if (!key) return c.text('missing key', 401);
const redis = new Redis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
const job = await redis.rpop<JobSpec>(c.env.QUEUE_NAME);
if (!job) return c.body(null, 204);
return c.json(job);
});


export default agents;
