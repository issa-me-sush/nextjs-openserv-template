import type { NextApiRequest, NextApiResponse } from 'next'
import { peekResult, takeResult } from '../../../lib/rendezvousStore'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  const id = String(req.query.id)
  const mode = String(req.query.mode || 'peek') // peek or take

  const stored = mode === 'take' ? takeResult(id) : peekResult(id)
  if (!stored) return res.status(204).end()

  return res.status(200).json({
    ok: true,
    id,
    receivedAt: new Date(stored.receivedAt).toISOString(),
    result: stored.payload
  })
}
