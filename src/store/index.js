import { create } from 'zustand'
export const useStore = create((set) => ({
  rigidity: 0.42, flow: 0.55, specular: 0.70,
  color: [0.72, 0.60, 0.52],
  mouse: [0, 0],
  uploadedImage: null, description: '', analysisResult: null,
  isAnalysing: false, analysisError: null,
  refImage: null, isGenerating: false,
  setUniform: (key, val) => set({ [key]: val }),
  setMouse: (xy) => set({ mouse: xy }),
  setUploadedImage: (img) => set({ uploadedImage: img }),
  setDescription: (d) => set({ description: d }),
  applyAnalysis: (json) => set({
    rigidity: json.rigidity ?? 0.42, flow: json.flow ?? 0.55,
    specular: json.specular ?? 0.70, color: json.color ?? [0.72,0.60,0.52],
    analysisResult: json, isAnalysing: false,
  }),
  setAnalysing: (v) => set({ isAnalysing: v, analysisError: null }),
  setAnalysisError: (e) => set({ analysisError: e, isAnalysing: false }),
  setRefImage: (url) => set({ refImage: url }),
  setGenerating: (v) => set({ isGenerating: v }),
}))
