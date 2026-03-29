import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import * as THREE from 'three'

// Applies the latest Fal.ai generated image as an emissive texture overlay
export function useAITexture(materialRef) {
  const refImage = useStore(s => s.refImage)
  const prevUrl  = useRef(null)

  useEffect(() => {
    if (!refImage || refImage === prevUrl.current) return
    if (!materialRef.current) return
    prevUrl.current = refImage

    const loader = new THREE.TextureLoader()
    loader.load(refImage, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      if (materialRef.current) {
        const u = materialRef.current.uniforms.uAITexture
        if (u) u.value = tex
        materialRef.current.needsUpdate = true

        // Fade in over 1.5s
        let t = 0
        const fade = setInterval(() => {
          t += 0.05
          const blend = materialRef.current?.uniforms?.uAIBlend
          if (blend) {
            blend.value = Math.min(t, 0.3)
          }
          if (t >= 0.3) clearInterval(fade)
        }, 75)
      }
    })
  }, [refImage, materialRef])
}
