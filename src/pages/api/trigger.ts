import type { NextApiRequest, NextApiResponse } from 'next'
import 'pino-pretty'

const WEBHOOK_URL = process.env.OPENSERV_TRIGGER_URL || 'https://api-staging.oserv.dev/webhooks/trigger/ec4b3b03b68540f18fc0820fb6be3e6f'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const r = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    })
    const text = await r.text()
    let data: any
    try { data = JSON.parse(text) } catch {
      data = { raw: text }
    }
    res.status(r.status).json({ ok: r.ok, status: r.status, data })
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'unknown error' })
  }
}
