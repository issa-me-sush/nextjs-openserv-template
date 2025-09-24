import { Agent, type AgentOptions } from '@openserv-labs/sdk'

type OpenServClient = Agent<string>

let cached: OpenServClient | null = null

export function getOpenServClient(): OpenServClient {
  if (cached) return cached
  const apiKey = process.env.OPENSERV_API_KEY
  if (!apiKey) throw new Error('Missing OPENSERV_API_KEY')

  const opts: AgentOptions<string> = {
    systemPrompt: 'helper',
    apiKey,
  }

  const apiUrl = process.env.OPENSERV_API_URL
  const runtimeUrl = process.env.OPENSERV_RUNTIME_URL
  // The SDK reads OPENSERV_* envs internally for base URLs; just ensure they are present in env
  if (apiUrl) process.env.OPENSERV_API_URL = apiUrl
  if (runtimeUrl) process.env.OPENSERV_RUNTIME_URL = runtimeUrl

  cached = new Agent(opts)
  return cached
}


