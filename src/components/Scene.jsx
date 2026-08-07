import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../store'
import MaterialSample from './MaterialSample'
import BoneParticles from './BoneParticles'

// A grid, not a free canvas. Up to six samples in three columns.
const COLS = 3
const SPACING = 1.8
const MULTI_SCALE = 0.40

function gridPosition(index, count) {
  if (count === 1) return [0, 0, 0]
  const cols = Math.min(COLS, count)
  const rows = Math.ceil(count / COLS)
  const col = index % COLS
  const row = Math.floor(index / COLS)
  return [
    (col - (cols - 1) / 2) * SPACING,
    ((rows - 1) / 2 - row) * SPACING,
    0,
  ]
}

function Board() {
  const layers = useStore((s) => s.layers)
  const selectedIds = useStore((s) => s.selectedIds)
  const mouse = useStore((s) => s.mouse)
  const selectOnly = useStore((s) => s.selectOnly)

  const count = layers.length
  const scale = count === 1 ? 1 : MULTI_SCALE

  // One geometry, shared by every sample on the board, and a lighter one once
  // there is more than a single sample.
  //
  // Measured on this machine at dpr 2 (2880x1800 buffer), milliseconds per
  // frame: one sample at detail 64, 1.2. Six at detail 32, 1.7. Six at detail
  // 64, 4.9. So the drop is not what keeps the board inside a frame budget
  // here; all three fit with room to spare. It is margin for weaker GPUs, and
  // it costs nothing to look at, because a sample on a six-up board is about
  // 300 CSS pixels across and detail 64 puts it near one triangle per pixel.
  const geometry = useMemo(() => {
    const detail = count === 1 ? 64 : 32
    return new THREE.IcosahedronGeometry(1.6, detail)
  }, [count])

  // Nothing is dimmed when the whole board is selected; otherwise unselected
  // samples fall back so the selection reads.
  const allSelected = selectedIds.length === layers.length

  return (
    <>
      {layers.map((layer, i) => {
        const on = selectedIds.includes(layer.id)
        return (
          <group key={layer.id} onClick={(e) => { e.stopPropagation(); selectOnly(layer.id) }}>
            <MaterialSample
              layer={layer}
              geometry={geometry}
              position={gridPosition(i, count)}
              scale={scale}
              dim={on || allSelected ? 1 : 0.34}
              mouse={mouse}
            />
          </group>
        )
      })}
      <BoneParticles
        position={gridPosition(
          Math.max(0, layers.findIndex((l) => l.id === selectedIds[0])),
          count,
        )}
        scale={scale}
      />
    </>
  )
}

export default function Scene() {
  const setMouse = useStore((s) => s.setMouse)

  const handleMouseMove = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setMouse([
      ((e.clientX - r.left) / r.width) * 2 - 1,
      ((e.clientY - r.top) / r.height) * -2 + 1,
    ])
  }, [setMouse])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }} onMouseMove={handleMouseMove}>
      <Canvas
        camera={{ position: [0, 0, 5.8], fov: 36 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.05} />
        <Board />
        <OrbitControls enableZoom enablePan={false} minDistance={2} maxDistance={8}
          rotateSpeed={0.4} dampingFactor={0.08} enableDamping />
      </Canvas>
    </div>
  )
}
