import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import vertGLSL from '../shaders/skeletal.vert.glsl?raw'
import fragGLSL from '../shaders/skeletal.frag.glsl?raw'

// Module-level ref so useAILoop can write texture directly
export const sharedMaterialRef = { current: null }

function makePlaceholderTexture() {
  const data = new Uint8Array([255, 255, 255, 255])
  const tex = new THREE.DataTexture(data, 1, 1)
  tex.needsUpdate = true
  return tex
}

export default function SkeletalMesh() {
  const meshRef  = useRef()
  const placeholderTex = useMemo(() => makePlaceholderTexture(), [])
  const rigidity = useStore(s => s.rigidity)
  const flow     = useStore(s => s.flow)
  const specular = useStore(s => s.specular)
  const color    = useStore(s => s.color)
  const mouse    = useStore(s => s.mouse)

  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader:   vertGLSL,
    fragmentShader: fragGLSL,
    uniforms: {
      uTime:        { value: 0 },
      uRigidity:    { value: 0.42 },
      uFlow:        { value: 0.55 },
      uSpecular:    { value: 0.70 },
      uColor:       { value: new THREE.Vector3(0.72, 0.60, 0.52) },
      uMouse:       { value: new THREE.Vector2(0, 0) },
      uMouseRadius: { value: 1.4 },
      uAITexture:   { value: placeholderTex },
      uAIBlend:     { value: 0.0 },
    },
    side: THREE.DoubleSide,
  }), [placeholderTex])

  // Share material with AI loop
  useEffect(() => {
    sharedMaterialRef.current = material
    return () => { sharedMaterialRef.current = null }
  }, [material])

  useEffect(() => { material.uniforms.uRigidity.value = rigidity }, [rigidity, material])
  useEffect(() => { material.uniforms.uFlow.value = flow }, [flow, material])
  useEffect(() => { material.uniforms.uSpecular.value = specular }, [specular, material])
  useEffect(() => { material.uniforms.uColor.value.set(color[0], color[1], color[2]) }, [color, material])
  useEffect(() => { material.uniforms.uMouse.value.set(mouse[0], mouse[1]) }, [mouse, material])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime()

    // Fade out AI blend over time (texture influence decays)
    if (material.uniforms.uAIBlend.value > 0) {
      material.uniforms.uAIBlend.value = Math.max(
        0, material.uniforms.uAIBlend.value - 0.001
      )
    }
  })

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.6, 64), [])

  return <mesh ref={meshRef} geometry={geometry} material={material} />
}
