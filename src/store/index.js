import { create } from 'zustand'
import SWATCH_PARAMS from '../data/swatch-params.json'
import { cancelAll } from '../utils/requests'

export const MAX_LAYERS = 6

// Fifty steps back. Snapshots are a few KB each because images are not in them
// (see `images` below), so the ceiling is about taste, not memory.
const MAX_HISTORY = 50

// A uniform drag emits a change per pointer move. Without merging, one drag
// would fill the whole stack.
const MERGE_MS = 250

// Leading edge, not trailing. The pre-change state is pushed on the FIRST
// change of a burst and further pushes are suppressed for MERGE_MS. A trailing
// debounce would leave an unpushed pending entry, so pressing undo mid-drag
// would need a flush-then-undo special case and would land one step too far
// back. This way undo during an open window returns to the pre-drag state with
// no special case at all.
//
// Module-level rather than store state on purpose: this is scheduling
// metadata, not part of the document, and must never reach a snapshot.
//
// Keyed, so a keystroke and a slider drag 100ms apart do not merge into one
// entry. Same window mechanism, separate gestures.
let mergeUntil = 0
let mergeKey = null

// Cotton is the opening sample: pale and soft, a material rather than the
// spiky high-rigidity end of the range.
const INITIAL_PARAMS = SWATCH_PARAMS.cotton

let seq = 0
const nextId = (prefix) => `${prefix}_${(seq++).toString(36)}_${Math.floor(performance.now()).toString(36)}`

const cloneParams = (p) => ({
  rigidity: p.rigidity,
  flow: p.flow,
  specular: p.specular,
  color: [p.color[0], p.color[1], p.color[2]],
})

export function makeLayer(init = {}) {
  const params = cloneParams(init.params ?? INITIAL_PARAMS)
  return {
    id: nextId('layer'),
    imageId: null,
    description: '',
    params,
    source: 'CACHED',
    rawJson: JSON.stringify(params, null, 2),
    status: 'idle',
    requestId: null,
    error: null,
    ...init,
    // init.params is already folded into `params` above; drop any raw copy so
    // the two cannot drift apart.
    ...(init.params ? { params } : {}),
  }
}

// A snapshot records the document, and neither of these is part of it.
//
// `status: 'analysing'` describes a network request, not a material. By the
// time you travel back to a snapshot that held it, undo has already aborted
// that request, so restoring the spinner would point it at something
// provably dead: unfalsifiable from the UI, with nothing to cancel. It
// normalises to 'idle'. Borrowing 'cancelled' instead would be worse, because
// that glyph means "you stopped this" and undo is not the user stopping it.
//
// `requestId` is a handle into the inflight map, which lives outside the store
// and outside history. A restored id would name a request that no longer
// exists.
const normaliseLayer = (l) => ({
  ...l,
  params: cloneParams(l.params),
  status: l.status === 'analysing' ? 'idle' : l.status,
  requestId: null,
})

// Selection is NOT in here. It is view state, not document: the stack answers
// "what did the content become", not "which layer was I looking at". Putting
// it in makes clicking through six layers cost six undo steps, which makes
// undo unusable. The cost of leaving it out is that undoing a change to a
// layer you are not looking at moves nothing on screen, and the fix for that
// is to move the selection to the changed layer after the jump, not to
// contaminate the history with it. See selectChanged below.
const snapshot = (s) => ({
  layers: s.layers.map(normaliseLayer),
})

const restore = (snap) => ({
  layers: snap.layers.map((l) => ({ ...l, params: cloneParams(l.params) })),
})

// What a layer looks like for the purpose of "did this change". Status and
// requestId are excluded: they are request state, and a time jump has already
// aborted whatever they referred to.
const contentKey = (l) => JSON.stringify([l.params, l.description, l.imageId, l.source])

// The layer a time jump actually changed, so the selection can follow it and
// the change is visible. Null when the jump added or removed layers rather
// than editing one, or when nothing identifiable moved.
const changedLayerId = (before, after) => {
  const beforeById = new Map(before.map((l) => [l.id, l]))
  for (const l of after) {
    const prev = beforeById.get(l.id)
    if (prev && contentKey(prev) !== contentKey(l)) return l.id
  }
  // Undoing a delete brings a layer back; that is the thing to look at.
  const beforeIds = new Set(before.map((l) => l.id))
  const returned = after.find((l) => !beforeIds.has(l.id))
  return returned ? returned.id : null
}

// Selection after a time jump. Move to the layer the jump changed, so the
// change is visible; otherwise leave the selection where it was, only pruning
// ids that no longer exist.
const selectAfterJump = (s, nextLayers) => {
  const target = changedLayerId(s.layers, nextLayers)
  if (target) return { selectedIds: [target] }
  const alive = s.selectedIds.filter((id) => nextLayers.some((l) => l.id === id))
  return { selectedIds: alive.length ? alive : nextLayers.length ? [nextLayers[0].id] : [] }
}

const firstLayer = makeLayer()

export const useStore = create((set, get) => ({
  layers: [firstLayer],
  selectedIds: [firstLayer.id],

  // Image sources live here, keyed by id, and are deliberately NOT part of the
  // undo snapshot. An uploaded photo is a 150-250KB data URL; six layers over
  // thirty history steps would be roughly 40MB of duplicated base64 held in
  // memory. Layers carry only `imageId`, so a snapshot stays a few KB.
  // If you are tempted to move `images` into the history snapshot: don't.
  images: {},

  // Scene level, not a property of any single material.
  mouse: [0, 0],

  past: [],
  future: [],

  setMouse: (xy) => set({ mouse: xy }),

  // Call BEFORE mutating. Every entry is the state as it was before the action
  // that is about to happen, which is what undo needs to return to.
  pushHistory: () => set((s) => ({
    past: [...s.past, snapshot(s)].slice(-MAX_HISTORY),
    future: [],
  })),

  undo: () => {
    const s = get()
    if (!s.past.length) return { moved: false, aborted: 0 }
    // Requests are aborted, never carried across a time jump. The alternative
    // is a response landing on a document that has moved out from under it.
    const aborted = cancelAll()
    // Close any open merge window so the next gesture opens a fresh entry
    // rather than merging into the one just undone.
    mergeUntil = 0; mergeKey = null
    const next = restore(s.past[s.past.length - 1])
    set({
      ...next,
      ...selectAfterJump(s, next.layers),
      past: s.past.slice(0, -1),
      future: [snapshot(s), ...s.future].slice(0, MAX_HISTORY),
    })
    return { moved: true, aborted }
  },

  redo: () => {
    const s = get()
    if (!s.future.length) return { moved: false, aborted: 0 }
    const aborted = cancelAll()
    mergeUntil = 0; mergeKey = null
    const next = restore(s.future[0])
    set({
      ...next,
      ...selectAfterJump(s, next.layers),
      past: [...s.past, snapshot(s)].slice(-MAX_HISTORY),
      future: s.future.slice(1),
    })
    return { moved: true, aborted }
  },

  putImage: (src) => {
    const id = nextId('img')
    set((s) => ({ images: { ...s.images, [id]: src } }))
    return id
  },

  addLayer: (init) => {
    const { layers } = get()
    if (layers.length >= MAX_LAYERS) return null
    get().pushHistory()
    const layer = makeLayer(init)
    set((s) => ({ layers: [...s.layers, layer], selectedIds: [layer.id] }))
    return layer.id
  },

  removeLayer: (id) => {
    get().pushHistory()
    set((s) => {
      const layers = s.layers.filter((l) => l.id !== id)
      const selectedIds = s.selectedIds.filter((x) => x !== id)
      return {
        layers,
        selectedIds: selectedIds.length ? selectedIds
          : layers.length ? [layers[0].id] : [],
      }
    })
  },

  reorderLayers: (fromIndex, toIndex) => {
    get().pushHistory()
    set((s) => {
      const layers = [...s.layers]
      const [moved] = layers.splice(fromIndex, 1)
      layers.splice(toIndex, 0, moved)
      return { layers }
    })
  },

  selectOnly: (id) => set({ selectedIds: [id] }),
  toggleSelect: (id) => set((s) => ({
    selectedIds: s.selectedIds.includes(id)
      ? (s.selectedIds.length > 1 ? s.selectedIds.filter((x) => x !== id) : s.selectedIds)
      : [...s.selectedIds, id],
  })),
  selectThrough: (id) => set((s) => {
    const idx = s.layers.findIndex((l) => l.id === id)
    const anchorId = s.selectedIds[0] ?? s.layers[0]?.id
    const anchor = s.layers.findIndex((l) => l.id === anchorId)
    if (idx < 0 || anchor < 0) return {}
    const [a, b] = anchor <= idx ? [anchor, idx] : [idx, anchor]
    return { selectedIds: s.layers.slice(a, b + 1).map((l) => l.id) }
  }),

  patchLayer: (id, patch) => set((s) => ({
    layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
  })),

  // Leading edge: the first change of a gesture pushes the state as it was
  // before the gesture started, then the window suppresses the rest. Used by
  // anything that emits a change per input event - slider drags and typing
  // alike. The rule is the same for both: the snapshot point is the first
  // visible write, whatever kind of write it is.
  mergedPush: (key) => {
    const now = Date.now()
    if (key !== mergeKey || now >= mergeUntil) get().pushHistory()
    mergeKey = key
    mergeUntil = now + MERGE_MS
  },

  // Typed descriptions land on the layer per keystroke, so they need the same
  // treatment as a drag. A user who types half a phrase and presses undo
  // expects the typing to go, not some unrelated earlier action.
  setDescription: (id, value) => {
    get().mergedPush(`desc:${id}`)
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, description: value } : l)) }))
  },

  // A uniform change applies to every selected layer at once.
  setSelectedParam: (key, value) => {
    get().mergedPush(`param:${key}`)
    set((s) => ({
      layers: s.layers.map((l) => (
        s.selectedIds.includes(l.id)
          ? { ...l, params: { ...l.params, [key]: value } }
          : l
      )),
    }))
  },

  applyAnalysis: (id, params, source) => set((s) => ({
    layers: s.layers.map((l) => (
      l.id === id
        ? {
            ...l,
            params: cloneParams(params),
            rawJson: JSON.stringify(params, null, 2),
            source,
            status: 'idle',
            // A landed result ends the request that produced it. Clearing this
            // here rather than in a second patch keeps "has a live request"
            // and "is analysing" from ever disagreeing for a frame.
            requestId: null,
            error: null,
          }
        : l
    )),
  })),
}))

// Selectors kept out of the store so they do not become part of any snapshot.
export const selectPrimary = (s) =>
  s.layers.find((l) => l.id === s.selectedIds[0]) ?? s.layers[0] ?? null

export const selectImageSrc = (s, layer) =>
  layer?.imageId ? (s.images[layer.imageId] ?? null) : null
