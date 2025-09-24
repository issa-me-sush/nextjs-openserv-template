import type { NextApiRequest, NextApiResponse } from 'next'
import { promises as fs } from 'fs'
import { getOpenServClient } from '../../lib/openserv'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  // Lazy import to keep cold start small
  const formidable = (await import('formidable')).default

  const form = formidable({ multiples: false, maxFileSize: 100 * 1024 * 1024 })

  try {
    const result = await new Promise<{ fields: any, files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err)
        resolve({ fields, files })
      })
    })

    const anyFiles = Object.values(result.files || {}) as any[]
    const f = anyFiles[0]
    if (!f) return res.status(400).json({ ok: false, error: 'No file received' })

    // formidable v3 returns arrays sometimes; normalize
    const file = Array.isArray(f) ? f[0] : f

    // Extract fields
    const getField = (name: string) => {
      const v = (result.fields as any)[name]
      if (v == null) return undefined
      return Array.isArray(v) ? v[0] : v
    }
    const workspaceIdRaw = getField('workspaceId') || process.env.WORKSPACE_ID
    const pathRaw = getField('path')
    const idRaw = getField('id')
    const skipSummarizerRaw = getField('skipSummarizer')
    const taskIdsRaw = getField('taskIds')

    const workspaceId = Number(workspaceIdRaw)
    if (!workspaceId || Number.isNaN(workspaceId)) {
      return res.status(400).json({ ok: false, error: 'workspaceId (number) required in form-data' })
    }
    const destPath = (file?.originalFilename || file?.newFilename || 'upload.bin')

    const skipSummarizer = typeof skipSummarizerRaw === 'string'
      ? ['1', 'true', 'yes', 'on'].includes(skipSummarizerRaw.toLowerCase())
      : false

    let taskIds: number[] | number | undefined
    if (typeof taskIdsRaw === 'string' && taskIdsRaw.trim()) {
      try {
        const parsed = JSON.parse(taskIdsRaw)
        if (Array.isArray(parsed)) taskIds = parsed.map((n: any) => Number(n)).filter((n: any) => !Number.isNaN(n))
        else taskIds = Number(parsed)
      } catch {
        const n = Number(taskIdsRaw)
        if (!Number.isNaN(n)) taskIds = n
      }
    }

    const buffer = await fs.readFile(file.filepath)

    const agent = getOpenServClient()
    const uploaded = await agent.uploadFile({
      workspaceId,
      path: destPath,
      file: buffer,
      skipSummarizer,
      taskIds: taskIds as any
    })

    const id = idRaw ? String(idRaw) : undefined
    return res.status(200).json({ ok: true, id, uploaded })
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || 'upload failed' })
  }
}


