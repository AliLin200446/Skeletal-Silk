import { create } from 'zustand'
import SWATCH_PARAMS from '../data/swatch-params.json'

// First paint is never an empty state: the silk swatch's cached parameters
// are the initial state, so the full form renders before any interaction.
const INITIAL = SWATCH_PARAMS.silk

export const useStore = create((set, get) => ({
  rigidity: INITIAL.rigidity, flow: INITIAL.flow, specular: INITIAL.specular,
  color: INITIAL.color,
  mouse: [0, 0],
  uploadedImage: null, description: '',
  analysisResult: INITIAL,
  analysisHistory: [{ ...INITIAL, timestamp: 0 }],
  isAnalysing: false, analysisError: null,

  setUniform: (key, val) => set({ [key]: val }),
  setMouse: (xy) => set({ mouse: xy }),
  setUploadedImage: (img) => set({ uploadedImage: img }),
  setDescription: (d) => set({ description: d }),

  applyAnalysis: (json) => {
    const prev = get().analysisHistory
    const entry = {
      rigidity: json.rigidity ?? 0.42,
      flow:     json.flow     ?? 0.55,
      specular: json.specular ?? 0.70,
      color:    json.color    ?? [0.72, 0.60, 0.52],
      timestamp: Date.now(),
    }
    // Keep last 3 states
    const history = [entry, ...prev].slice(0, 3)
    set({
      rigidity: entry.rigidity,
      flow:     entry.flow,
      specular: entry.specular,
      color:    entry.color,
      analysisResult:  json,
      analysisHistory: history,
      isAnalysing: false,
    })
  },

  setAnalysing:     (v) => set({ isAnalysing: v, analysisError: null }),
  setAnalysisError: (e) => set({ analysisError: e, isAnalysing: false }),
}))
