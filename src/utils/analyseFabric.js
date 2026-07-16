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

export async function analyseFabric({ imageBase64, mediaType = 'image/jpeg', description }) {
  let res
  try {
    res = await fetch('/api/analyse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mediaType, description }),
    })
  } catch {
    throw new Error('ANALYSIS UNREACHABLE — CHECK CONNECTION OR TRY A PRESET')
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

export async function fileToBase64(file) {
  const url = URL.createObjectURL(file)
  const img = await loadImage(url, () => URL.revokeObjectURL(url))
  return imageToBase64(img)
}

// Preset swatches go through the exact same downscale + analyse path as uploads.
export async function imageUrlToBase64(url) {
  const img = await loadImage(url)
  return imageToBase64(img)
}
