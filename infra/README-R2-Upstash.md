# Setup: Cloudflare R2 + Upstash Redis


## R2 (bucket for outputs + model blobs)
1) Create bucket `nuros-grid` in Cloudflare R2.
2) In `wrangler.toml`, ensure R2 binding `R2` matches bucket name.


## Upstash Redis (queue)
1) Create a Redis database in Upstash.
2) Copy the REST URL and REST TOKEN.
3) In the Worker, set secrets:
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN


## Agent admin key
- Generate one-time admin key to register agents (MVP).
wrangler secret put AGENT_ADMIN_KEY


## Deploy
- In GitHub repo secrets, add:
- CF_API_TOKEN, CF_ACCOUNT_ID
- Push to `main` to trigger CI.


## Local dev
- `cd apps/api && npm run dev` (uses wrangler dev)
- `cd apps/web && npm run dev`
- Run agent: `NUROS_API=http://127.0.0.1:8787 NUROS_KEY=test cargo run`
