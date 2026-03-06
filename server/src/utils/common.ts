import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

export function getEnvInt(name: string, fallback: number): number {
  const rawValue = process.env[name]
  if (!rawValue) return fallback

  const parsedValue = Number.parseInt(rawValue, 10)
  return Number.isNaN(parsedValue) ? fallback : parsedValue
}

export function getIsoTimestamp(): string {
  return new Date().toISOString()
}

export async function appendJsonLine(filePath: string, payload: Record<string, unknown>) {
  await mkdir(path.dirname(filePath), { recursive: true })
  const line = `${JSON.stringify(payload)}\n`
  await appendFile(filePath, line, { encoding: 'utf8' })
}
