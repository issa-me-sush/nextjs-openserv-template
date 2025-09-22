import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const [body, setBody] = useState('what is web3')
  const [autoId, setAutoId] = useState<string>('')
  const [resp, setResp] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [pollMs, setPollMs] = useState<number>(5000)
  const [maxWaitMs, setMaxWaitMs] = useState<number>(300000) // 5 minutes default
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const trigger = async () => {
    setResp('')
    setLoading(true)
    const id = String(Date.now())
    setAutoId(id)

    // Fire webhook
    await fetch('/api/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, id })
    })

    // Start polling result
    startPolling(id)
  }

  const startPolling = (id: string) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const begun = Date.now()
    timerRef.current = setInterval(async () => {
      // Stop if exceeded max wait
      if (Date.now() - begun > maxWaitMs) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        setLoading(false)
        setResp(JSON.stringify({ timeout: true, id }))
        return
      }
      const r = await fetch(`/api/result/${encodeURIComponent(id)}?mode=peek`, { cache: 'no-store' })
      if (r.status === 204) return
      const j = await r.json()
      setResp(JSON.stringify(j, null, 2))
      setLoading(false)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
    }, Math.max(1000, Number(pollMs) || 5000))
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  return (
    <main style={{ maxWidth: 680, margin: '40px auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1>Remote Execution (Polling)</h1>
      <p>Click Trigger to send a request. We auto-generate an ID from the send timestamp.</p>
      <div style={{ display: 'grid', gap: 12 }}>
        <label>
          Body
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} style={{ width: '100%' }} />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <label>
            Poll interval (ms)
            <input type="number" value={pollMs} onChange={e => setPollMs(Number(e.target.value))} style={{ marginLeft: 8, width: 120 }} />
          </label>
          <label style={{ marginLeft: 16 }}>
            Max wait (ms)
            <input type="number" value={maxWaitMs} onChange={e => setMaxWaitMs(Number(e.target.value))} style={{ marginLeft: 8, width: 140 }} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={trigger} disabled={loading}>{loading ? 'Waiting…' : 'Trigger'}</button>
        </div>
      </div>
      {autoId && (
        <p>Auto ID: {autoId}</p>
      )}
      <h3>Result</h3>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{loading ? 'Waiting… (polling)' : resp}</pre>
      {/* Latency display removed */}
    </main>
  )
}
