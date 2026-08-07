// Request bookkeeping for the board.
//
// None of this lives in the zustand store. An AbortController is not
// serialisable and must never be captured by an undo snapshot, and the set of
// open requests is not part of the document the user is editing: undoing a
// slider drag should not resurrect a request that already landed. The store
// holds one string per layer, `requestId`, which is the only thing the two
// halves share.

export class RateLimitedError extends Error {
  constructor(msg) {
    super(msg)
    this.name = 'RateLimitedError'
  }
}

// Thrown out of analyseFabric when the user cancels, so the caller can tell a
// deliberate cancel apart from a timeout. Both surface as AbortError on fetch.
export class AnalysisCancelledError extends Error {
  constructor() {
    super('ANALYSIS CANCELLED')
    this.name = 'AnalysisCancelledError'
  }
}

// requestId -> { layerId, controller }. A request is "live" exactly while it is
// in this map: cancelling deletes it, so the landing check below has a single
// source of truth rather than a boolean that can be set twice.
const inflight = new Map()

// layerId -> timestamp of its last request. Per layer, not global: analysing
// six different materials in a row is the intended use of the board, and a
// global cooldown would punish it. Re-firing the *same* layer is the accident.
const lastRequestAt = new Map()

export const COOLDOWN_MS = 2_500

// Three at once. This is a cost guard, not a load guard. The tempting design is
// a queue, but a queue hides the cost: six clicks would drain quietly and the
// user would pay for six analyses without ever seeing six in flight. Requests
// past the cap are refused out loud instead.
export const MAX_CONCURRENT = 3

let seq = 0
const nextId = () => `req_${(seq++).toString(36)}_${Math.floor(performance.now()).toString(36)}`

export function inflightCount() {
  return inflight.size
}

export function isLayerBusy(layerId) {
  for (const r of inflight.values()) if (r.layerId === layerId) return true
  return false
}

// Throws RateLimitedError rather than returning null: every rejection here has
// a reason the user needs to read, and a null would lose it.
export function beginRequest(layerId) {
  if (isLayerBusy(layerId)) {
    throw new RateLimitedError('THIS LAYER IS ALREADY ANALYSING')
  }
  if (inflight.size >= MAX_CONCURRENT) {
    throw new RateLimitedError(`${MAX_CONCURRENT} ANALYSES AT ONCE IS THE LIMIT — WAIT FOR ONE TO LAND`)
  }
  const since = Date.now() - (lastRequestAt.get(layerId) ?? 0)
  if (since < COOLDOWN_MS) {
    throw new RateLimitedError(
      `EASY — WAIT ${Math.ceil((COOLDOWN_MS - since) / 1000)}S BEFORE RE-ANALYSING THIS LAYER`,
    )
  }
  const requestId = nextId()
  const controller = new AbortController()
  inflight.set(requestId, { layerId, controller })
  lastRequestAt.set(layerId, Date.now())
  return { requestId, controller }
}

// True only while the request is still the one we are waiting on. Cancelling,
// or finishing, removes it.
export function isLive(requestId) {
  return inflight.has(requestId)
}

export function endRequest(requestId) {
  inflight.delete(requestId)
}

// Deleting before aborting is deliberate: abort() runs the fetch rejection
// synchronously in some paths, and the handler asks isLive() whether it should
// still write. It must already be false by then.
export function cancelRequest(requestId) {
  const entry = inflight.get(requestId)
  if (!entry) return false
  inflight.delete(requestId)
  entry.controller.abort(new AnalysisCancelledError())
  return true
}

export function cancelLayer(layerId) {
  let cancelled = false
  for (const [id, r] of inflight) {
    if (r.layerId === layerId && cancelRequest(id)) cancelled = true
  }
  return cancelled
}

export function cancelAll() {
  for (const id of [...inflight.keys()]) cancelRequest(id)
}
