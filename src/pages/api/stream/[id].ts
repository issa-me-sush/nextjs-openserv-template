import type { NextApiRequest, NextApiResponse } from 'next'
import { subscribe, unsubscribe, sseDebugSnapshot } from '../../../lib/sseHub'
import { peekResult } from '../../../lib/rendezvousStore'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed')
  const id = String(req.query.id)

  console.log('[SSE] start stream for id:', id, '| snapshot:', sseDebugSnapshot())

  // If result already present, return immediately and close
  const existing = peekResult(id)
  if (existing) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.write(`data: ${JSON.stringify({ id, result: existing.payload, receivedAt: new Date(existing.receivedAt).toISOString() })}\n\n`)
    console.log('[SSE] immediate send and close for id:', id)
    return res.end()
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  subscribe(id, res)

  req.on('close', () => {
    console.log('[SSE] client closed for id:', id, '| snapshot before unsub:', sseDebugSnapshot())
    unsubscribe(id)
    console.log('[SSE] after client closed | snapshot:', sseDebugSnapshot())
  })
}
