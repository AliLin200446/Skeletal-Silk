import { useRef, useCallback, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import { sharedMaterialRef } from '../components/SkeletalMesh'

const INTERVAL = 7000

export function useAILoop() {
  const intervalRef   = useRef(null)
  const countdownRef  = useRef(null)
  const isRunning     = useRef(false)
  const setRefImage   = useStore(s => s.setRefImage)
  const [progress,    setProgress]   = useState(0)
  const [generating,  setGenerating] = useState(false)

  const startCountdown = useCallback(() => {
    clearInterval(countdownRef.current)
    setProgress(0)
    const start = Date.now()
    countdownRef.current = setInterval(() => {
      const pct = ((Date.now() - start) / INTERVAL) * 100
      if (pct >= 99) {
        clearInterval(countdownRef.current)
        setProgress(99)
      } else {
        setProgress(pct)
      }
    }, 80)
  }, [])

  const runOnce = useCallback(async () => {
    if (isRunning.current) return
    isRunning.current = true
    clearInterval(countdownRef.current)
    setGenerating(true)
    setProgress(99)

    const key = import.meta.env.VITE_FAL_API_KEY

    if (!key) {
      isRunning.current = false
      setGenerating(false)
      startCountdown()
      return
    }

    const { rigidity, description } = useStore.getState()
    const structure = rigidity > 0.7
      ? 'skeletal bone lattice emerging from silk'
      : rigidity > 0.4
      ? 'semi-rigid membrane with bone nodes'
      : 'liquid silk with subtle bone structure'
    const prompt = `${description || 'biomorphic textile'}: ${structure}, macro photography, black background, ultra detailed`

    try {
      const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${key}`,
        },
        body: JSON.stringify({
          prompt,
          image_size: 'square_hd',
          num_images: 1,
          num_inference_steps: 4,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const url = data?.images?.[0]?.url
        if (url) {
          setRefImage(url)
          setProgress(100)
          // Load Fal.ai image as texture and blend into mesh
          const loader = new THREE.TextureLoader()
          loader.load(url, (tex) => {
            const mat = sharedMaterialRef.current
            if (!mat) return
            tex.colorSpace = THREE.SRGBColorSpace
            mat.uniforms.uAITexture.value = tex
            // Fade in blend value
            let blend = 0
            const fadeIn = setInterval(() => {
              blend = Math.min(blend + 0.02, 0.25)
              if (mat.uniforms.uAIBlend) mat.uniforms.uAIBlend.value = blend
              if (blend >= 0.25) clearInterval(fadeIn)
            }, 30)
          })
        }
      } else {
        console.error('Fal.ai:', res.status, await res.text())
      }
    } catch (e) {
      console.warn('AI loop error:', e.message)
    } finally {
      isRunning.current = false
      setGenerating(false)
      startCountdown()
    }
  }, [setRefImage, startCountdown])

  const start = useCallback(() => {
    if (intervalRef.current) return

    const tick = async () => {
      await runOnce()
      // Only schedule next if still active
      if (intervalRef.current !== null) {
        intervalRef.current = setTimeout(tick, INTERVAL)
      }
    }

    intervalRef.current = setTimeout(tick, 0) // start immediately
  }, [runOnce])

  const stop = useCallback(() => {
    const id = intervalRef.current
    intervalRef.current = null // set null FIRST to prevent rescheduling
    clearTimeout(id)
    clearTimeout(countdownRef.current)
    isRunning.current = false
    setProgress(0)
    setGenerating(false)
  }, [])

  useEffect(() => () => stop(), [stop])

  return { start, stop, progress, generating }
}
