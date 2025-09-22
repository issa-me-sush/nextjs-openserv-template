import type { NextApiRequest, NextApiResponse } from 'next'
import { deliver } from './wait/[id]'
import { setResult } from '../../lib/rendezvousStore'
import { publish } from '../../lib/sseHub'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })
  const { id, output } = req.body || {}
  if (!id) return res.status(400).json({ error: 'id required' })

  // Resolve any waiter
  deliver(String(id), { id, output })
  // Store for polling
  setResult(String(id), { id, output })
  // Publish to SSE subscriber
  publish(String(id), { id, output, receivedAt: new Date().toISOString() })

  return res.status(200).json({ ok: true })
}
