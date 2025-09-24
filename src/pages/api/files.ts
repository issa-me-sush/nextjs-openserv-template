import type { NextApiRequest, NextApiResponse } from 'next'
import { getOpenServClient } from '../../lib/openserv'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })
  const workspaceId = Number(req.query.workspaceId || process.env.WORKSPACE_ID)
  if (!workspaceId || Number.isNaN(workspaceId)) return res.status(400).json({ error: 'workspaceId (number) required (set WORKSPACE_ID env or pass query)' })

  try {
    const agent = getOpenServClient()
    const files = await agent.getFiles({ workspaceId })
    return res.status(200).json(files)
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'failed to get files' })
  }
}


