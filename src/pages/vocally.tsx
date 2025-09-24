import { useEffect, useRef, useState } from 'react'

export default function Vocally() {
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [status, setStatus] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [mediaRecorder])

  const startPolling = (id: string, intervalMs = 2000) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    setStatus('Waiting for callback… (polling)')
    pollTimerRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/result/${encodeURIComponent(id)}?mode=peek`, { cache: 'no-store' })
        if (r.status === 204) return
        const j = await r.json()
        setResult(j)
        setStatus('Done')
        if (pollTimerRef.current) clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      } catch (e) {
        // keep polling
      }
    }, Math.max(1000, intervalMs))
  }

  const start = async () => {
    setResult(null)
    setStatus('Requesting microphone...')
    const id = String(Date.now())
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    chunksRef.current = []
    mr.ondataavailable = ev => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data) }
    mr.onstop = async () => {
      try {
        setStatus('Encoding audio...')
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' })

        setStatus('Uploading audio...')
        const fd = new FormData()
        fd.append('file', file)
        fd.append('id', id)
        const ur = await fetch('/api/upload', { method: 'POST', body: fd })
        const uj = await ur.json()
        if (!uj?.ok) throw new Error(uj?.error || 'upload failed')
        const fileUrl = uj?.uploaded?.fullUrl
        if (!fileUrl) throw new Error('No file URL returned')

        setStatus('Triggering transcription & scoring...')
        await fetch('/api/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action: 'transcribe_and_score', fileUrl })
        })

        startPolling(id, 2000)
      } catch (e: any) {
        setStatus('Error: ' + (e?.message || String(e)))
      }
    }
    mr.start()
    setMediaRecorder(mr)
    setRecording(true)
    setStatus('Recording...')
  }

  const stop = () => {
    if (!mediaRecorder) return
    mediaRecorder.stop()
    setRecording(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Vocally</h1>
          <p className="text-gray-600 mt-1">Record audio → upload → trigger agent → await callback.</p>
        </header>

        <section className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-3">
            {!recording ? (
              <button onClick={start} className="inline-flex items-center rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700">Start recording</button>
            ) : (
              <button onClick={stop} className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black">Stop</button>
            )}
            <span className="text-sm text-gray-700">{status}</span>
          </div>

          {result && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
              <pre className="bg-gray-900 text-gray-100 rounded-md p-4 text-xs overflow-x-auto whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}


