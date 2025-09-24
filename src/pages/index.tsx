import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const [body, setBody] = useState('what is web3')
  const [autoId, setAutoId] = useState<string>('')
  const [resp, setResp] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [pollMs, setPollMs] = useState<number>(5000)
  const [maxWaitMs, setMaxWaitMs] = useState<number>(300000)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadInfo, setUploadInfo] = useState<string>('')
  const [workspaceId, setWorkspaceId] = useState<number | null>(null)
  const [filesInfo, setFilesInfo] = useState<string>('')

  const trigger = async () => {
    setResp('')
    setLoading(true)
    const id = String(Date.now())
    setAutoId(id)

    await fetch('/api/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, id })
    })

    startPolling(id)
  }

  const startPolling = (id: string) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const begun = Date.now()
    timerRef.current = setInterval(async () => {
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

  const upload = async () => {
    const el = fileInputRef.current
    if (!el || !el.files || el.files.length === 0) {
      setUploadInfo('Select a file first')
      return
    }
    const file = el.files[0]
    const fd = new FormData()
    fd.append('file', file)
    if (workspaceId) fd.append('workspaceId', String(workspaceId))
    setUploadInfo('Uploading...')
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      const j = await r.json()
      setUploadInfo(JSON.stringify(j, null, 2))
    } catch (e: any) {
      setUploadInfo('Upload failed: ' + (e?.message || String(e)))
    }
  }

  const listFiles = async () => {
    setFilesInfo('Loading...')
    try {
      const qs = workspaceId ? `?workspaceId=${encodeURIComponent(String(workspaceId))}` : ''
      const r = await fetch(`/api/files${qs}`, { cache: 'no-store' })
      const j = await r.json()
      setFilesInfo(JSON.stringify(j, null, 2))
    } catch (e: any) {
      setFilesInfo('Failed: ' + (e?.message || String(e)))
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">OpenServ Agent Console</h1>
          <p className="text-gray-600 mt-1">Trigger jobs, upload files to a workspace, and view results.</p>
        </header>

        <section className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Remote Execution (Polling)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={6}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Poll interval (ms)</label>
                <input
                  type="number"
                  value={pollMs}
                  onChange={e => setPollMs(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Max wait (ms)</label>
                <input
                  type="number"
                  value={maxWaitMs}
                  onChange={e => setMaxWaitMs(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
            <div>
              <button
                onClick={trigger}
                disabled={loading}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Waiting…' : 'Trigger'}
              </button>
            </div>
            {autoId && (
              <p className="text-sm text-gray-600">Auto ID: <span className="font-mono">{autoId}</span></p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
              <pre className="bg-gray-900 text-gray-100 rounded-md p-4 text-xs overflow-x-auto whitespace-pre-wrap">
                {loading ? 'Waiting… (polling)' : resp}
              </pre>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-5">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Workspace Files</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Workspace ID (optional override)</label>
                <input
                  type="number"
                  value={workspaceId ?? ''}
                  placeholder="Defaults to WORKSPACE_ID env"
                  onChange={e => setWorkspaceId(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Test upload (pdf/image/audio)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*,audio/*"
                className="mt-1 block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={upload}
                className="inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
              >Upload</button>
              <button
                type="button"
                onClick={listFiles}
                className="inline-flex items-center rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black"
              >List files</button>
            </div>
            {uploadInfo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload response</label>
                <pre className="bg-gray-900 text-gray-100 rounded-md p-4 text-xs overflow-x-auto whitespace-pre-wrap">{uploadInfo}</pre>
              </div>
            )}
            {filesInfo && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Files</label>
                <pre className="bg-gray-900 text-gray-100 rounded-md p-4 text-xs overflow-x-auto whitespace-pre-wrap">{filesInfo}</pre>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
