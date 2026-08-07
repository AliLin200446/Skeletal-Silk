import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore, selectPrimary } from '../store'

export default function BoneParticles({ position = [0,0,0], scale = 1 }) {
  const ref = useRef()
  // Reads the first selected layer. Averaging across a multi-selection
  // would render a material that is not on the board.
  const rigidity = useStore(selectPrimary).params.rigidity

  const { positions, phases } = useMemo(() => {
    const count = 300
    const positions = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.6 + Math.random() * 0.4
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta)
      positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i*3+2] = r * Math.cos(phi)
      phases[i] = Math.random() * Math.PI * 2
    }
    return { positions, phases }
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const pos = ref.current.geometry.attributes.position.array
    for (let i = 0; i < 300; i++) {
      const base = positions[i*3+1]
      pos[i*3+1] = base + Math.sin(t * 0.8 + phases[i]) * 0.04 * rigidity
    }
    ref.current.geometry.attributes.position.needsUpdate = true
    ref.current.material.opacity = 0.15 + rigidity * 0.25
  })

  return (
    <points ref={ref} position={position} scale={scale}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]}/>
      </bufferGeometry>
      <pointsMaterial size={0.012} color="#e8e0d4" transparent opacity={0.2} sizeAttenuation/>
    </points>
  )
}
