import { Hono } from 'hono';
import agents from './routes/agents';
import { jobs } from './routes/jobs';


app.use('*', async (c, next) => {
  const origin = c.req.header('origin') || '*';
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Vary', 'Origin');
  c.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, x-admin-key');
  c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  return next();
});


const app = new Hono();
app.route('/v1/agent', agents);
app.route('/v1/jobs', jobs);
app.get('/', (c) => c.text('Nuros Grid API v0.1.0'));


export default app;
