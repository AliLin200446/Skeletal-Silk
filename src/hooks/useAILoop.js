import { useRef, useCallback, useEffect, useState } from 'react'
import { useStore } from '../store'

const INTERVAL = 7000

export function useAILoop(glRef) {
  const intervalRef   = useRef(null)
  const countdownRef  = useRef(null)
  const isRunning     = useRef(false)
  const setRefImage   = useStore(s => s.setRefImage)
  const [progress,    setProgress]   = useState(0)
  const [generating,  setGenerating] = useState(false)

  const captureFrame = useCallback(() => {
    const canvas = glRef.current?.domElement
    if (!canvas) return null
    try {
      // Crop to center square to reduce black border
      const size = Math.min(canvas.width, canvas.height)
      const offscreen = document.createElement('canvas')
      offscreen.width = 512
      offscreen.height = 512
      const ctx = offscreen.getContext('2d')
      const srcX = (canvas.width - size) / 2
      const srcY = (canvas.height - size) / 2
      ctx.drawImage(canvas, srcX, srcY, size, size, 0, 0, 512, 512)
      return offscreen.toDataURL('image/jpeg', 0.85).split(',')[1]
    } catch { return null }
  }, [glRef])

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
    const frame = captureFrame()

    if (!key || !frame) {
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
      const res = await fetch('https://fal.run/fal-ai/fast-lcm-diffusion/image-to-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Key ${key}`,
        },
        body: JSON.stringify({
          prompt,
          image_url: `data:image/jpeg;base64,${frame}`,
          strength: 0.4,
          num_inference_steps: 6,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const url = data?.images?.[0]?.url
        if (url) { setRefImage(url); setProgress(100) }
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
  }, [captureFrame, setRefImage, startCountdown])

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
