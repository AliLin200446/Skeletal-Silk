import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store'
import vertGLSL from '../shaders/skeletal.vert.glsl?raw'
import fragGLSL from '../shaders/skeletal.frag.glsl?raw'

export default function SkeletalMesh() {
  const meshRef  = useRef()
  const rigidity = useStore(s => s.rigidity)
  const flow     = useStore(s => s.flow)
  const specular = useStore(s => s.specular)
  const color    = useStore(s => s.color)
  const mouse    = useStore(s => s.mouse)
  const analysisHistory = useStore(s => s.analysisHistory)

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
      uRigidity2:   { value: 0.42 },
      uFlow2:       { value: 0.55 },
      uSpecular2:   { value: 0.70 },
      uColor2:      { value: new THREE.Vector3(0.72, 0.60, 0.52) },
      uRigidity3:   { value: 0.42 },
      uFlow3:       { value: 0.55 },
      uColor3:      { value: new THREE.Vector3(0.72, 0.60, 0.52) },
      uMorphCycle:  { value: 0.0 },
    },
    side: THREE.DoubleSide,
  }), [])

  useEffect(() => {
    if (analysisHistory.length >= 2) {
      const s = analysisHistory[1]
      material.uniforms.uRigidity2.value = s.rigidity
      material.uniforms.uFlow2.value     = s.flow
      material.uniforms.uSpecular2.value = s.specular
      material.uniforms.uColor2.value.set(s.color[0], s.color[1], s.color[2])
    }
    if (analysisHistory.length >= 3) {
      const s = analysisHistory[2]
      material.uniforms.uRigidity3.value = s.rigidity
      material.uniforms.uFlow3.value     = s.flow
      material.uniforms.uColor3.value.set(s.color[0], s.color[1], s.color[2])
    }
  }, [analysisHistory, material])

  useEffect(() => { material.uniforms.uRigidity.value = rigidity }, [rigidity, material])
  useEffect(() => { material.uniforms.uFlow.value = flow }, [flow, material])
  useEffect(() => { material.uniforms.uSpecular.value = specular }, [specular, material])
  useEffect(() => { material.uniforms.uColor.value.set(color[0], color[1], color[2]) }, [color, material])
  useEffect(() => { material.uniforms.uMouse.value.set(mouse[0], mouse[1]) }, [mouse, material])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    material.uniforms.uTime.value = t
    material.uniforms.uMorphCycle.value = (Math.sin(t * 0.15) + 1.0) / 2.0
  })

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.6, 64), [])

  return <mesh ref={meshRef} geometry={geometry} material={material} />
}
