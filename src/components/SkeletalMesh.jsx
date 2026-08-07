import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore, selectPrimary } from '../store'
import vertGLSL from '../shaders/skeletal.vert.glsl?raw'
import fragGLSL from '../shaders/skeletal.frag.glsl?raw'

export default function SkeletalMesh() {
  const meshRef  = useRef()
  const primary  = useStore(selectPrimary)
  const rigidity = primary.params.rigidity
  const flow     = primary.params.flow
  const specular = primary.params.specular
  const color    = primary.params.color
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

  // The sample shows the material you selected, and only that one. The three
  // morph slots previously carried the last three analyses and uMorphCycle
  // cross-faded between them on a slow sine, so the surface rendered a
  // rotating average of recent selections — pick leather after silk and you
  // got neither. That was the art piece's "temporal memory"; on a
  // measurement bench the sample under the light has to be the sample.
  useEffect(() => {
    const u = material.uniforms
    u.uRigidity.value = u.uRigidity2.value = u.uRigidity3.value = rigidity
  }, [rigidity, material])
  useEffect(() => {
    const u = material.uniforms
    u.uFlow.value = u.uFlow2.value = u.uFlow3.value = flow
  }, [flow, material])
  useEffect(() => {
    const u = material.uniforms
    u.uSpecular.value = u.uSpecular2.value = specular
  }, [specular, material])
  useEffect(() => {
    const u = material.uniforms
    u.uColor.value.set(color[0], color[1], color[2])
    u.uColor2.value.set(color[0], color[1], color[2])
    u.uColor3.value.set(color[0], color[1], color[2])
  }, [color, material])
  useEffect(() => { material.uniforms.uMouse.value.set(mouse[0], mouse[1]) }, [mouse, material])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    material.uniforms.uTime.value = t
    // uMorphCycle stays at 0: with all three slots holding the same material
    // the shader's cross-fade is a no-op, and the sample stays what you picked.
  })

  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.6, 64), [])

  return <mesh ref={meshRef} geometry={geometry} material={material} />
}
