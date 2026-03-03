import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { mkdir, appendFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

const PORT = Number.parseInt(process.env.PORT ?? '5174', 10)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'

const ContactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(5000),
  website: z.string().optional()
})

type ContactPayload = z.infer<typeof ContactSchema>

async function storeContactMessage(input: Omit<ContactPayload, 'website'> & { meta: Record<string, unknown> }) {
  const dataDir = path.join(process.cwd(), 'data')
  await mkdir(dataDir, { recursive: true })

  const line = JSON.stringify({ ...input, createdAt: new Date().toISOString() }) + '\n'
  await appendFile(path.join(dataDir, 'contact-messages.jsonl'), line, { encoding: 'utf8' })
}

const app = express()

app.set('trust proxy', true)
app.use(helmet())
app.use(morgan('dev'))
app.use(express.json({ limit: '64kb' }))
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true)
      if (origin === CLIENT_ORIGIN) return cb(null, true)
      return cb(new Error('CORS not allowed'))
    }
  })
)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/contact', async (req, res) => {
  const parsed = ContactSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message }))
    })
  }

  const { website, ...payload } = parsed.data

  // Honeypot: if filled, pretend success but ignore.
  if (website && website.trim().length > 0) {
    return res.status(201).json({ ok: true })
  }

  try {
    await storeContactMessage({
      ...payload,
      meta: {
        ip: req.ip,
        userAgent: req.get('user-agent') ?? null,
        referer: req.get('referer') ?? null
      }
    })
    return res.status(201).json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to store message' })
  }
})

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})

