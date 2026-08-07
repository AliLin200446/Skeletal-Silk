import { create } from 'zustand'
import SWATCH_PARAMS from '../data/swatch-params.json'

export const MAX_LAYERS = 6

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

  setMouse: (xy) => set({ mouse: xy }),

  putImage: (src) => {
    const id = nextId('img')
    set((s) => ({ images: { ...s.images, [id]: src } }))
    return id
  },

  addLayer: (init) => {
    const { layers } = get()
    if (layers.length >= MAX_LAYERS) return null
    const layer = makeLayer(init)
    set({ layers: [...layers, layer], selectedIds: [layer.id] })
    return layer.id
  },

  removeLayer: (id) => set((s) => {
    const layers = s.layers.filter((l) => l.id !== id)
    const selectedIds = s.selectedIds.filter((x) => x !== id)
    return {
      layers,
      selectedIds: selectedIds.length ? selectedIds
        : layers.length ? [layers[0].id] : [],
    }
  }),

  reorderLayers: (fromIndex, toIndex) => set((s) => {
    const layers = [...s.layers]
    const [moved] = layers.splice(fromIndex, 1)
    layers.splice(toIndex, 0, moved)
    return { layers }
  }),

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

  // A uniform change applies to every selected layer at once.
  setSelectedParam: (key, value) => set((s) => ({
    layers: s.layers.map((l) => (
      s.selectedIds.includes(l.id)
        ? { ...l, params: { ...l.params, [key]: value } }
        : l
    )),
  })),

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
