import { create } from 'zustand'

export const useStore = create((set, get) => ({
  rigidity: 0.42, flow: 0.55, specular: 0.70,
  color: [0.72, 0.60, 0.52],
  mouse: [0, 0],
  uploadedImage: null, description: '',
  analysisResult: null, analysisHistory: [],
  isAnalysing: false, analysisError: null,
  refImage: null, isGenerating: false,

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
  setRefImage:      (url) => set({ refImage: url }),
  setGenerating:    (v) => set({ isGenerating: v }),
}))
