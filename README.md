# Next Agent (Webhook + Result Delivery)

A minimal Next.js app that:
- Sends a webhook to your platform with `{ id, body }`
- Receives the agent’s callback `{ id, output }`
- Returns the result to the UI (via polling by default)

The OpenServ SDK agent is run separately (see `agent-server/`).

Note: `agent-server/` is included here for convenience. It is ignored by Vercel deployments via `.vercelignore` so you can deploy the Next app without the agent. You can copy this folder out to its own repo/service at any time.

## Quick Start (Local)

1) Install and run Next
```bash
cd next-agent
npm i
npm run dev
# http://localhost:3000
```

2) Run the agent server (separate process)
```bash
cd next-agent/agent-server
export OPENSERV_API_KEY=your_key
# optional callback override if not using localhost
# export AGENT_CALLBACK_URL=https://your-domain/api/callback
npx ts-node agent-receive-server.ts
# http://localhost:7378
```

3) Configure your platform
- Agent endpoint: public URL of the agent server (port 7378)
- When the platform completes work, it should call the agent’s capability `receive` with:
  ```json
  {
    "args": { "ID": "<id>", "data": "<output-text>" }
  }
  ```
- The agent forwards `{ id, output }` to the Next callback at `/api/callback`.

4) Trigger from UI
- Open http://localhost:3000
- Enter the body
- Click Trigger
- The app auto-generates an `id` and starts polling `/api/result/:id` until the callback arrives
  

## Local testing with ngrok (agent only)

If your platform (or OpenServ) needs a public agent URL during local dev:

```bash
# Expose Agent (port 7378)
ngrok http 7378

# Start the agent inside agent-server/
npx tsx agent-receive-server.ts
```

- In OpenServ (or your platform), set the Agent endpoint to: `https://<ngrok-7378-domain>`.
- The agent posts back to your local Next app at `http://localhost:3000/api/callback` by default. If your Next app is deployed (not local), set `AGENT_CALLBACK_URL` to your deployed domain’s `/api/callback`.


## API Endpoints (Next)
- `POST /api/trigger` → forwards `{ id, body }` to your platform’s webhook (set `OPENSERV_TRIGGER_URL` if desired)
- `POST /api/callback` → agent sends `{ id, output }` here; app stores and exposes it
- `GET /api/result/:id?mode=peek` → returns result if available; otherwise 204 (used by UI polling)

## Notes
- Default UI uses polling; change interval and max wait in the form.
- For long-running jobs on Vercel, polling is more resilient and cost-effective than holding open SSE/WebSockets.
- The agent server should be hosted as a persistent Node service in production.

## Polling (default) and SSE (optional)

- Polling default (UI): implemented in `src/pages/index.tsx`.
  - The UI polls `GET /api/result/:id?mode=peek` until a result exists.
  - Change at runtime: use the "Poll interval (ms)" input on the page.
  - Change default interval: edit `const [pollMs, setPollMs] = useState<number>(5000)` in `src/pages/index.tsx`.
  - Change max wait: use the "Max wait (ms)" input (defaults to 300000ms).
- SSE available (not used by default): `GET /api/stream/:id`.
  - Present for optional streaming/instant delivery; the current UI does not subscribe.
  - It does not interfere with polling; it only sends if a client subscribes.

## Environment Variables

Create a `.env` file (or export in your shell). Example values are shown in `.env.example`.

Next app (web UI + API routes):
- `OPENSERV_TRIGGER_URL` (optional): Upstream webhook URL that `/api/trigger` POSTs to.
- `WAIT_TIMEOUT_MS` (optional): Default long-poll timeout for `/api/wait/:id` (ms, default 300000).

Agent server (runs separately in `agent-server/`):
- `OPENSERV_API_KEY` (required): OpenServ SDK API key to start the agent.
- `AGENT_CALLBACK_URL` (optional): Where the agent POSTs results, defaults to `http://localhost:3000/api/callback`.
- `OPENSERV_API_URL` (optional): Override SDK API base URL.
- `OPENSERV_RUNTIME_URL` (optional): Override SDK runtime URL.

Deployment helpers:
- `VERCEL_URL` (auto on Vercel): Used by the agent to derive callback URL if `AGENT_CALLBACK_URL` is not set.
