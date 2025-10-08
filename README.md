# Nuros Grid (MVP)


Cloudflare-first GPU job marketplace. Buyers submit jobs; agents claim and process.


## Apps
- `apps/web`: Next.js static site for buyers and contributors (Cloudflare Pages)
- `apps/api`: Cloudflare Worker API (Hono) for agents and job queue
- `agent`: Rust agent (Windows/Linux)


## Quick start
1. Set up R2 + Upstash, add secrets with `wrangler secret put`.
2. Deploy API via GitHub Actions or `npx wrangler deploy`.
3. Deploy Web via GitHub Actions.
4. Run the Rust agent locally with `NUROS_API` and `NUROS_KEY`.
5. Create a test job on `/console` and watch the agent claim it.
