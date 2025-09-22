type Stored = { payload: any, receivedAt: number }

const results = new Map<string, Stored>()

export function setResult(id: string, payload: any) {
  results.set(id, { payload, receivedAt: Date.now() })
}

export function takeResult(id: string): Stored | undefined {
  const v = results.get(id)
  if (v) results.delete(id)
  return v
}

export function peekResult(id: string): Stored | undefined {
  return results.get(id)
}
