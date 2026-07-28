// Contract violation (non-JSON / bad fields) — distinct from network errors
// so the caller can fall back to the last valid parameter set.
export class InvalidAnalysisError extends Error {
  constructor(msg) {
    super(msg)
    this.name = 'InvalidAnalysisError'
  }
}

const clamp01 = (n) => Math.max(0, Math.min(1, n))
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

// Validation layer: rigidity/flow/specular must be finite numbers,
// color must be a 3-array of finite numbers; values are clamped to [0,1].
export function validateParams(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidAnalysisError('ANALYSIS RESPONSE IS NOT AN OBJECT')
  }
  for (const key of ['rigidity', 'flow', 'specular']) {
    if (!isNum(parsed[key])) throw new InvalidAnalysisError(`MISSING OR NON-NUMERIC "${key.toUpperCase()}"`)
  }
  if (!Array.isArray(parsed.color) || parsed.color.length !== 3 || !parsed.color.every(isNum)) {
    throw new InvalidAnalysisError('INVALID "COLOR" — EXPECTED [r,g,b]')
  }
  return {
    rigidity: clamp01(parsed.rigidity),
    flow: clamp01(parsed.flow),
    specular: clamp01(parsed.specular),
    color: parsed.color.map(clamp01),
  }
}

// A hung request is worse than a failed one: the panel would sit in its
// analysing state forever with no way back. Bound it.
const REQUEST_TIMEOUT_MS = 30_000

// Cheap accidental-spend guard. Every analysis costs money, and a user
// double-clicking swatches or dragging a folder in can otherwise fire a
// burst of them. Enforced client-side only — it stops accidents, not abuse.
const COOLDOWN_MS = 2_500
let lastRequestAt = 0
let inFlight = false

export class RateLimitedError extends Error {
  constructor(msg) {
    super(msg)
    this.name = 'RateLimitedError'
  }
}

export async function analyseFabric({ imageBase64, mediaType = 'image/jpeg', description }) {
  if (inFlight) {
    throw new RateLimitedError('ONE ANALYSIS AT A TIME — THIS ONE IS STILL RUNNING')
  }
  const since = Date.now() - lastRequestAt
  if (since < COOLDOWN_MS) {
    throw new RateLimitedError(
      `EASY — WAIT ${Math.ceil((COOLDOWN_MS - since) / 1000)}S BETWEEN ANALYSES`,
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  inFlight = true
  lastRequestAt = Date.now()

  let res
  try {
    res = await fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mediaType, description }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('ANALYSIS TIMED OUT AFTER 30S — TRY AGAIN OR PICK A SWATCH')
    }
    throw new Error('ANALYSIS UNREACHABLE — CHECK CONNECTION OR TRY A PRESET')
  } finally {
    clearTimeout(timer)
    inFlight = false
  }
  if (!res.ok) {
    if (res.status === 429) throw new Error('ANALYSIS RATE LIMITED — TRY AGAIN SHORTLY')
    if (res.status === 503) throw new Error('ANALYSIS OFFLINE — TRY A PRESET')
    if (res.status === 413) throw new Error('IMAGE TOO LARGE — TRY A SMALLER PHOTO')
    throw new Error('ANALYSIS FAILED — TRY AGAIN OR USE A PRESET')
  }
  let parsed
  try {
    parsed = await res.json()
  } catch {
    throw new InvalidAnalysisError('ANALYSIS RESPONSE IS NOT JSON')
  }
  return validateParams(parsed)
}

const MAX_EDGE = 1024
const JPEG_QUALITY = 0.8

// Shared downscale path — keeps payloads well under serverless body limits.
function imageToBase64(img) {
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  return { base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' }
}

function loadImage(src, cleanup) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      cleanup?.()
      resolve(img)
    }
    img.onerror = () => {
      cleanup?.()
      reject(new Error('COULD NOT READ IMAGE — TRY A DIFFERENT FILE'))
    }
    img.src = src
  })
}

// Anything past this is a photo library dump or a video, not a fabric shot.
// Checked before decode so a huge file fails fast instead of pinning a tab.
const MAX_FILE_BYTES = 12 * 1024 * 1024

export class InvalidFileError extends Error {
  constructor(msg) {
    super(msg)
    this.name = 'InvalidFileError'
  }
}

export function assertUsableImage(file) {
  if (!file) {
    throw new InvalidFileError('NO FILE RECEIVED — TRY DROPPING IT AGAIN')
  }
  if (!file.type || !file.type.startsWith('image/')) {
    const kind = file.type ? file.type.split('/')[0].toUpperCase() : 'UNKNOWN'
    throw new InvalidFileError(`THAT IS A ${kind} FILE — DROP A JPG, PNG OR WEBP`)
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new InvalidFileError(`IMAGE IS ${mb}MB — KEEP IT UNDER 12MB`)
  }
}

export async function fileToBase64(file) {
  assertUsableImage(file)
  const url = URL.createObjectURL(file)
  const img = await loadImage(url, () => URL.revokeObjectURL(url))
  return imageToBase64(img)
}

// Preset swatches go through the exact same downscale + analyse path as uploads.
export async function imageUrlToBase64(url) {
  const img = await loadImage(url)
  return imageToBase64(img)
}
