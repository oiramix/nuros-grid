import { Hono } from 'hono';
import agents from './routes/agents';
import { jobs } from './routes/jobs';


const app = new Hono();
app.route('/v1/agent', agents);
app.route('/v1/jobs', jobs);
app.get('/', (c) => c.text('Nuros Grid API v0.1.0'));


export default app;
