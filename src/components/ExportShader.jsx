import { useState, useCallback } from 'react'
import { useStore } from '../store'
import vertGLSL from '../shaders/skeletal.vert.glsl?raw'
import fragGLSL from '../shaders/skeletal.frag.glsl?raw'

// What leaves the app: the shader source plus the uniform values Claude read
// for this material. Both are required to reproduce the look elsewhere — the
// shader alone is identical for every material, the numbers alone are inert.
function buildExport({ rigidity, flow, specular, color }) {
  const v3 = color.map((c) => c.toFixed(4)).join(', ')
  return `// Skeletal Silk — material export
// Parameters read by Claude Vision from the source image.
// Drop into a THREE.ShaderMaterial; morph states are pinned to the current
// material so the surface renders static.

const uniforms = {
  uTime:        { value: 0 },
  uRigidity:    { value: ${rigidity} },
  uFlow:        { value: ${flow} },
  uSpecular:    { value: ${specular} },
  uColor:       { value: new THREE.Vector3(${v3}) },
  uMouse:       { value: new THREE.Vector2(0, 0) },
  uMouseRadius: { value: 1.4 },
  uMorphCycle:  { value: 0 },
  uRigidity2:   { value: ${rigidity} },
  uFlow2:       { value: ${flow} },
  uColor2:      { value: new THREE.Vector3(${v3}) },
  uRigidity3:   { value: ${rigidity} },
  uFlow3:       { value: ${flow} },
  uColor3:      { value: new THREE.Vector3(${v3}) },
}
// Advance uniforms.uTime.value each frame for the surface animation.

/* ============================ vertex shader ============================ */
${vertGLSL.trim()}

/* =========================== fragment shader =========================== */
${fragGLSL.trim()}
`
}

export default function ExportShader() {
  const [state, setState] = useState('idle')
  const rigidity = useStore((s) => s.rigidity)
  const flow = useStore((s) => s.flow)
  const specular = useStore((s) => s.specular)
  const color = useStore((s) => s.color)

  const handleExport = useCallback(async () => {
    const text = buildExport({ rigidity, flow, specular, color })
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      // Clipboard can be blocked (permissions, insecure context) — fall back
      // to a download so the export never silently fails.
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'skeletal-silk-material.glsl.js'
      a.click()
      URL.revokeObjectURL(url)
      setState('downloaded')
    }
    setTimeout(() => setState('idle'), 2200)
  }, [rigidity, flow, specular, color])

  return (
    <div className="export-dock">
      <button className="export-btn" onClick={handleExport}>
        {state === 'copied' ? '✓  COPIED TO CLIPBOARD'
          : state === 'downloaded' ? '✓  DOWNLOADED'
          : 'EXPORT SHADER + PARAMETERS'}
      </button>
      <div className="export-hint">GLSL plus the four values read from your image</div>
      <div className="sample-caption">
        preview sample — a neutral surface driven by the four uniforms; the
        reading and the export are the point, not photoreal cloth
      </div>
    </div>
  )
}
