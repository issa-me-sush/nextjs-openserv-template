import type { NextApiResponse } from 'next'

// Persist across Next dev hot-reloads
const g = globalThis as any
if (!g.__SSE_SUBS__) g.__SSE_SUBS__ = new Map<string, { res: NextApiResponse, heartbeat: NodeJS.Timeout }>()
const subscribers: Map<string, { res: NextApiResponse, heartbeat: NodeJS.Timeout }> = g.__SSE_SUBS__

export function subscribe(id: string, res: NextApiResponse) {
  const existing = subscribers.get(id)
  if (existing) {
    try { existing.res.end() } catch {}
    clearInterval(existing.heartbeat)
  }
  const heartbeat = setInterval(() => {
    try { res.write(`: keepalive\n\n`) } catch {}
  }, 25000)
  subscribers.set(id, { res, heartbeat })
  console.log('[SSE] subscribed:', id, '| total:', subscribers.size)
}

export function unsubscribe(id: string) {
  const sub = subscribers.get(id)
  if (!sub) return
  clearInterval(sub.heartbeat)
  subscribers.delete(id)
  console.log('[SSE] unsubscribed:', id, '| total:', subscribers.size)
}

export function publish(id: string, data: any) {
  const sub = subscribers.get(id)
  if (!sub) {
    console.log('[SSE] publish missed (no subscriber):', id, '| total:', subscribers.size, '| keys:', Array.from(subscribers.keys()))
    return false
  }
  try {
    sub.res.write(`data: ${JSON.stringify(data)}\n\n`)
    sub.res.end()
    console.log('[SSE] published and closed:', id)
  } catch (e) {
    console.error('[SSE] publish error:', id, e)
  }
  clearInterval(sub.heartbeat)
  subscribers.delete(id)
  console.log('[SSE] after publish remove | total:', subscribers.size)
  return true
}

export function sseDebugSnapshot() {
  return { size: subscribers.size, keys: Array.from(subscribers.keys()) }
}
