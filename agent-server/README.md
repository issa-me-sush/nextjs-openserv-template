# Agent Server (Standalone)

This folder contains a standalone OpenServ SDK agent that exposes a single capability `receive`.
It runs as a separate Node process from the Next app and forwards results back to the Next callback.

## Run locally
```bash
cd next-agent/agent-server
# required
export OPENSERV_API_KEY=your_key
# optional
export AGENT_CALLBACK_URL=http://localhost:3000/api/callback
OPENSERV_API_URL=https://api-staging.oserv.dev
OPENSERV_RUNTIME_URL=https://agents-staging.oserv.dev
# If you keep a .env in this folder, it will be auto-loaded (via dotenv/config)
# when you run from inside this directory.

# Recommended (ESM-friendly):
npx tsx agent-receive-server.ts

# Or, with ts-node ESM mode:
# npx ts-node --esm agent-receive-server.ts
```

- Agent listens (default) on port 7378
- Capability endpoint: `POST http://localhost:7378/tools/receive`
  ```json
  {
    "args": { "ID": "123", "data": "hello" }
  }
  ```
- On success, it POSTs to the Next app callback: `POST /api/callback { id, output }`

## Deploying
- Host this file as a persistent Node service (Railway/Render/Fly/Docker/etc.)
- Configure `AGENT_CALLBACK_URL` to your Next site’s callback endpoint.
- Point the OpenServ platform (or your orchestrator) to the agent’s public URL.

### Using a .env file from the repo root
If you prefer to launch from the repo root but keep `.env` inside `agent-server/`, set the path:

```bash
DOTENV_CONFIG_PATH=agent-server/.env npx tsx agent-server/agent-receive-server.ts
# or
DOTENV_CONFIG_PATH=agent-server/.env npx ts-node --esm agent-server/agent-receive-server.ts
```

Note: Ensure `dotenv` is installed in the repo (e.g. `npm i dotenv`).

## ngrok for local testing (agent only)

Expose the agent and use its public URL in your platform:

```bash
ngrok http 7378   # Agent server

# Start the agent
npx tsx agent-receive-server.ts
```

In OpenServ (or your platform), set the agent endpoint to `https://<ngrok-7378-domain>`.
