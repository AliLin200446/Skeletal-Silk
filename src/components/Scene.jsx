import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useCallback } from 'react'
import { useStore } from '../store'
import SkeletalMesh from './SkeletalMesh'
import BoneParticles from './BoneParticles'

export default function Scene() {
  const setMouse = useStore(s => s.setMouse)

  const handleMouseMove = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setMouse([((e.clientX-r.left)/r.width)*2-1, ((e.clientY-r.top)/r.height)*-2+1])
  }, [setMouse])

  return (
    <div style={{width:'100%',height:'100%',position:'relative'}} onMouseMove={handleMouseMove}>
      <Canvas
        camera={{position:[0,0,5.8],fov:36}}
        gl={{antialias:true,alpha:true,preserveDrawingBuffer:true}}
        style={{background:'transparent'}}
      >
        <ambientLight intensity={0.05}/>
        <SkeletalMesh/>
        <BoneParticles/>
        <OrbitControls enableZoom enablePan={false} minDistance={2} maxDistance={8} rotateSpeed={0.4} dampingFactor={0.08} enableDamping/>
      </Canvas>
    </div>
  )
}
