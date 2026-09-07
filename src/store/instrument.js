import { create } from "zustand";

export const useInstrument = create((set) => ({
  light: [-0.95, 0.55, 0.3],
  intensity: 1,
  fps: null,
  setLight: (light) => set({ light }),
  setIntensity: (intensity) => set({ intensity }),
  setFps: (fps) => set({ fps }),
}));
