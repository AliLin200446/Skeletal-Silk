/* global process */
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `
You are a material analysis engine for a biomorphic textile simulation.
Return ONLY a JSON object:
{ "rigidity": 0.0-1.0, "flow": 0.0-1.0, "specular": 0.0-1.0, "color": [r,g,b] }
Heuristics:
- Silk/satin: rigidity 0.1-0.25, flow 0.75-0.95, specular 0.75-0.95
- Chiffon: rigidity 0.05-0.15, flow 0.85-1.0, specular 0.5-0.75
- Linen/cotton: rigidity 0.40-0.60, flow 0.30-0.50, specular 0.05-0.25
- Velvet: rigidity 0.30-0.50, flow 0.40-0.60, specular 0.02-0.15
- Brocade: rigidity 0.70-0.90, flow 0.15-0.35, specular 0.40-0.65
- Leather: rigidity 0.65-0.85, flow 0.05-0.20, specular 0.45-0.75
- Bone: rigidity 0.88-1.0, flow 0.02-0.15, specular 0.30-0.60
Output ONLY valid JSON. No markdown.
`.trim()

const DEFAULTS = { rigidity: 0.42, flow: 0.55, specular: 0.7, color: [0.72, 0.6, 0.52] }

// Missing/malformed fields fall back to DEFAULTS, not 0
function clampField(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback
}

// The prompt gives explicit 0.0-1.0 ranges for the three scalars but not for
// colour, so the model answers in conventional 0-255 RGB. Clamping that to
// [0,1] flattened every saturated colour to 1 and rendered pure white — the
// model was reading colour correctly all along. Normalise before clamping.
function normaliseColor(raw, fallback) {
  if (!Array.isArray(raw) || raw.length !== 3) return fallback
  const nums = raw.map(Number)
  if (nums.some((n) => !Number.isFinite(n))) return fallback
  const scale = nums.some((n) => n > 1) ? 255 : 1
  return nums.map((n) => Math.max(0, Math.min(1, n / scale)))
}

function sanitise(parsed) {
  return {
    rigidity: clampField(parsed.rigidity, DEFAULTS.rigidity),
    flow: clampField(parsed.flow, DEFAULTS.flow),
    specular: clampField(parsed.specular, DEFAULTS.specular),
    color: normaliseColor(parsed.color, DEFAULTS.color),
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'Analysis service is not configured' })
  }

  const { imageBase64, mediaType, description } = req.body ?? {}
  if (!imageBase64 && !description?.trim()) {
    return res.status(400).json({ error: 'Provide an image or a description' })
  }

  // Server-side ceiling. The client already downscales to 1024px, but the
  // client is not the security boundary — anything can POST here, and image
  // tokens are what this endpoint actually spends money on. ~4MB of base64
  // is far above a legitimate downscaled JPEG.
  if (typeof imageBase64 === 'string' && imageBase64.length > 4_000_000) {
    return res.status(413).json({ error: 'Image is too large' })
  }
  if (typeof description === 'string' && description.length > 500) {
    return res.status(413).json({ error: 'Description is too long' })
  }

  const userContent = []
  if (imageBase64) {
    userContent.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: typeof mediaType === 'string' ? mediaType : 'image/jpeg',
        data: imageBase64,
      },
    })
  }
  userContent.push({
    type: 'text',
    text: description?.trim()
      ? `Analyse fabric: "${description.trim()}". Return JSON.`
      : 'Analyse this fabric image. Return JSON.',
  })

  const client = new Anthropic()
  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 256,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    })
    const raw = msg.content.find((b) => b.type === 'text')?.text ?? '{}'
    let parsed
    try {
      parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch {
      return res.status(502).json({ error: 'Analysis returned an unreadable result' })
    }
    // Pass the upstream token counts through untouched. Added alongside the
    // analysis, not folded into it: sanitise() still decides every parameter
    // the shader sees, and this field is ignored by validateParams.
    return res.status(200).json({
      ...sanitise(parsed),
      usage: {
        input_tokens: msg.usage?.input_tokens ?? null,
        output_tokens: msg.usage?.output_tokens ?? null,
        model: msg.model ?? null,
      },
    })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: 'Analysis is rate limited — try again shortly' })
    }
    if (err instanceof Anthropic.APIError) {
      console.error('analyse:', err.status, err.message)
      return res.status(502).json({ error: 'Analysis service failed' })
    }
    console.error('analyse:', err)
    return res.status(500).json({ error: 'Analysis service failed' })
  }
}
