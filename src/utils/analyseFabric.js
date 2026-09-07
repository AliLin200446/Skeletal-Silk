import { AnalysisCancelledError } from './requests'

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

// The controller comes from the caller (see utils/requests.js), which is what
// makes a request cancellable from the UI. Concurrency, per-layer cooldown and
// cancellation all live there now; this function is transport and validation.
export async function analyseFabric({ imageBase64, mediaType = 'image/jpeg', description, controller }) {
  const ctrl = controller ?? new AbortController()
  // The same controller carries the timeout, so there is exactly one abort
  // path and signal.reason can say which of the two fired.
  const timer = setTimeout(() => ctrl.abort(new Error('timeout')), REQUEST_TIMEOUT_MS)

  let res
  try {
    res = await fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mediaType, description }),
      signal: ctrl.signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      const reason = ctrl.signal.reason
      // A user cancel is not a failure, and must not be reported as one.
      if (reason instanceof AnalysisCancelledError) throw reason
      throw new Error('ANALYSIS TIMED OUT AFTER 30S — TRY AGAIN OR PICK A SWATCH')
    }
    throw new Error('ANALYSIS UNREACHABLE — CHECK CONNECTION OR TRY A PRESET')
  } finally {
    clearTimeout(timer)
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
  // The usage block rides alongside the parameters. validateParams reads only
  // the four it knows about, so an absent or malformed usage field can never
  // affect what the shader is given.
  return { params: validateParams(parsed), usage: parsed.usage ?? null }
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
  return { ...imageToBase64(img), width: img.naturalWidth, height: img.naturalHeight }
}

// Preset swatches go through the exact same downscale + analyse path as uploads.
export async function imageUrlToBase64(url) {
  const img = await loadImage(url)
  return imageToBase64(img)
}
