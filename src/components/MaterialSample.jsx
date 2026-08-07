import { useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import vertGLSL from '../shaders/skeletal.vert.glsl?raw'
import fragGLSL from '../shaders/skeletal.frag.glsl?raw'

// One layer, one mesh, one material. Geometry is passed in and shared across
// every sample on the board: only the material differs per layer, and six
// copies of a 64-subdivision icosahedron would be pure waste.
export default function MaterialSample({ layer, geometry, position, scale, dim, mouse }) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vertGLSL,
    fragmentShader: fragGLSL,
    uniforms: {
      uTime:        { value: 0 },
      uRigidity:    { value: layer.params.rigidity },
      uFlow:        { value: layer.params.flow },
      uSpecular:    { value: layer.params.specular },
      uColor:       { value: new THREE.Vector3(...layer.params.color) },
      uMouse:       { value: new THREE.Vector2(0, 0) },
      uMouseRadius: { value: 1.4 },
      uDim:         { value: 1 },
    },
    side: THREE.DoubleSide,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  const { rigidity, flow, specular, color } = layer.params
  useEffect(() => { material.uniforms.uRigidity.value = rigidity }, [rigidity, material])
  useEffect(() => { material.uniforms.uFlow.value = flow }, [flow, material])
  useEffect(() => { material.uniforms.uSpecular.value = specular }, [specular, material])
  useEffect(() => {
    material.uniforms.uColor.value.set(color[0], color[1], color[2])
  }, [color, material])
  useEffect(() => { material.uniforms.uDim.value = dim }, [dim, material])
  useEffect(() => { material.uniforms.uMouse.value.set(mouse[0], mouse[1]) }, [mouse, material])

  useEffect(() => () => material.dispose(), [material])

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.getElapsedTime()
  })

  return (
    <mesh geometry={geometry} material={material} position={position} scale={scale} />
  )
}
