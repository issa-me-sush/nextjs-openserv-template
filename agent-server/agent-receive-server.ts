/**
 * Standalone OpenServ Agent (default port 7378)
 * Location: next-agent/agent-server/agent-receive-server.ts
 *
 * Purpose:
 * - Exposes a single capability 'receive' that accepts { id|ID, data }
 * - Forwards results to the Next app callback: POST http://localhost:3000/api/callback { id, output }
 * - This process runs separately from the Next app (as a backend worker/server)
 *
 * Run locally:
 *   cd next-agent/agent-server
 *   OPENSERV_API_KEY=... npx ts-node agent-receive-server.ts
 *
 * Env:
 *   OPENSERV_API_KEY          (required)
 *   OPENSERV_API_URL          (optional, SDK override)
 *   OPENSERV_RUNTIME_URL      (optional, SDK override)
 *   AGENT_CALLBACK_URL        (defaults to http://localhost:3000/api/callback)
 */

import 'dotenv/config'
import { Agent } from '@openserv-labs/sdk'
import { z } from 'zod'

const PORT = 7378 // SDK default
const CALLBACK_URL = process.env.AGENT_CALLBACK_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/callback` : 'http://localhost:3000/api/callback')

const OPENSERV_API_KEY = process.env.OPENSERV_API_KEY || ''
const OPENSERV_API_URL = process.env.OPENSERV_API_URL
const OPENSERV_RUNTIME_URL = process.env.OPENSERV_RUNTIME_URL

if (!OPENSERV_API_KEY) {
  console.error('❌ Please set OPENSERV_API_KEY in your environment')
  process.exit(1)
}

const agent = new Agent({
  systemPrompt: 'You are a minimal webhook-capable agent that forwards results to a callback.',
  apiKey: OPENSERV_API_KEY,
})

agent.addCapability({
  name: 'receive',
  description: 'Receive data payload and forward to callback for the UI to consume',
  schema: z.object({
    id: z.union([z.string(), z.number()]).optional().describe('Correlation id (lowercase variant)'),
    ID: z.union([z.string(), z.number()]).optional().describe('Correlation id (uppercase variant)'),
    data: z.string().describe('Payload content to send back to UI')
  }).passthrough(),
  async run({ args }) {
    try {
      console.log('📥 receive: raw args:', args)
      try { console.log('📥 receive: keys:', Object.keys(args || {})) } catch {}
      const id = (args.id ?? args.ID)
      const output = args.data
      if (id == null) {
        try { console.error('❌ receive: missing id/ID in args; keys:', Object.keys(args || {})) } catch { console.error('❌ receive: missing id/ID in args') }
        return 'missing id'
      }
      const payload = { id: String(id), output }
      console.log('↗️  receive → posting callback:', CALLBACK_URL, payload)
      const r = await fetch(CALLBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      let text = ''
      try { text = await r.text() } catch {}
      console.log('✅ receive: callback status', r.status, '| body:', text)
      return JSON.stringify({ ok: true, id: String(id) })
    } catch (err: any) {
      console.error('❌ receive failed:', err?.message || err)
      return 'error'
    }
  }
})

async function main() {
  console.log('🚀 Starting OpenServ Agent (receive) ...')
  console.log('   Port:', PORT)
  console.log('   Callback URL:', CALLBACK_URL)
  console.log('   OPENSERV_API_KEY:', OPENSERV_API_KEY.substring(0, 8) + '...')
  if (OPENSERV_API_URL) console.log('   OPENSERV_API_URL:', OPENSERV_API_URL)
  if (OPENSERV_RUNTIME_URL) console.log('   OPENSERV_RUNTIME_URL:', OPENSERV_RUNTIME_URL)

  await agent.start()

  console.log('✅ Agent listening')
  console.log(`🔗 Root:            http://localhost:${PORT}/`)
  console.log(`🔧 Capability URL:  http://localhost:${PORT}/tools/receive`)
  console.log('📫 Example direct call (POST JSON to /tools/receive):')
  console.log('   { "args": { "ID": "1", "data": "what is web3?" } }')

  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...')
    try {
      await agent.stop()
      console.log('✅ Agent stopped')
    } catch (e) {
      console.error('❌ Error while stopping agent:', e)
    } finally {
      process.exit(0)
    }
  })
}

main().catch((e) => {
  console.error('❌ Failed to start agent:', e)
  process.exit(1)
})
