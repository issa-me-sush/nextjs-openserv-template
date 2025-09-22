import type { NextApiRequest, NextApiResponse } from 'next'

type Resolver = (value: unknown) => void

// Store payload and when it was received
const results = new Map<string, { payload: any, receivedAt: number }>()
const waiters = new Map<string, Resolver>()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  const { id } = req.query
  const key = String(id)

  const start = Date.now()
  const envDefault = Number(process.env.WAIT_TIMEOUT_MS || 300000) // default 5 minutes
  const timeoutMs = Number(req.query.timeoutMs ?? envDefault)

  // result already present
  if (results.has(key)) {
    const stored = results.get(key)!
    results.delete(key)
    const ended = Date.now()
    return res.status(200).json({
      ok: true,
      id: key,
      timeout: false,
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(ended).toISOString(),
      waitedMs: ended - start,
      receivedAt: new Date(stored.receivedAt).toISOString(),
      result: stored.payload
    })
  }

  // otherwise wait with timeout
  let timeout: NodeJS.Timeout

  const val: any = await new Promise(resolve => {
    waiters.set(key, resolve)
    timeout = setTimeout(() => {
      if (waiters.get(key) === resolve) waiters.delete(key)
      resolve({ __timeout: true })
    }, timeoutMs)
  })

  clearTimeout(timeout!)
  const ended = Date.now()

  if (val && val.__timeout) {
    return res.status(200).json({
      ok: true,
      id: key,
      timeout: true,
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(ended).toISOString(),
      waitedMs: ended - start,
      result: null
    })
  }

  // Normal delivery path (payload may already contain receivedAt)
  const receivedAt = typeof val?.receivedAt === 'number' ? val.receivedAt : ended
  return res.status(200).json({
    ok: true,
    id: key,
    timeout: false,
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(ended).toISOString(),
    waitedMs: ended - start,
    receivedAt: new Date(receivedAt).toISOString(),
    result: val
  })
}

// helper used by callback route
export function deliver(id: string, payload: any) {
  const now = Date.now()
  const withMeta = { payload, receivedAt: now }
  const waiter = waiters.get(id)
  if (waiter) {
    waiters.delete(id)
    waiter({ ...payload, receivedAt: now })
  } else {
    results.set(id, withMeta)
  }
}
