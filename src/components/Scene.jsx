import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useCallback, useState } from 'react'
import { useStore } from '../store'
import SkeletalMesh from './SkeletalMesh'
import BoneParticles from './BoneParticles'
import { useAILoop } from '../hooks/useAILoop'

export default function Scene() {
  const setMouse  = useStore(s => s.setMouse)
  const [active, setActive] = useState(false)
  const { start, stop, progress, generating } = useAILoop()

  const handleMouseMove = useCallback((e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setMouse([((e.clientX-r.left)/r.width)*2-1, ((e.clientY-r.top)/r.height)*-2+1])
  }, [setMouse])

  const toggle = () => {
    if (active) { stop(); setActive(false) }
    else { start(); setActive(true) }
  }

  return (
    <div style={{width:'100%',height:'100%',position:'relative'}} onMouseMove={handleMouseMove}>
      <Canvas
        camera={{position:[0,0,2.8],fov:55}}
        gl={{antialias:true,alpha:false}}
        style={{background:'#000'}}
      >
        <ambientLight intensity={0.05}/>
        <SkeletalMesh/>
        <BoneParticles/>
        <OrbitControls enableZoom enablePan={false} minDistance={2} maxDistance={8} rotateSpeed={0.4} dampingFactor={0.08} enableDamping/>
      </Canvas>

      <div style={{
        position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
        width:240,
      }}>

        {/* Progress indicator — only when active */}
        {active && (
          <div style={{
            width:'100%', padding:'8px 12px',
            border:'0.5px solid rgba(255,255,255,0.12)',
            background:'rgba(0,0,0,0.7)',
          }}>
            <div style={{
              display:'flex', justifyContent:'space-between',
              fontSize:'8px', letterSpacing:'0.16em', marginBottom:6,
              color: generating ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
            }}>
              <span>{generating ? '◉ GENERATING IMAGE' : '◎ NEXT GENERATION'}</span>
              <span style={{fontVariantNumeric:'tabular-nums'}}>
                {generating ? '···' : `${Math.round(progress)}%`}
              </span>
            </div>
            <div style={{width:'100%', height:'1px', background:'rgba(255,255,255,0.08)'}}>
              {generating
                ? <div style={{
                    height:'1px', background:'rgba(255,255,255,0.6)',
                    animation:'shimmer 1s ease-in-out infinite', width:'40%',
                    position:'relative',
                  }}/>
                : <div style={{
                    height:'1px', background:'rgba(255,255,255,0.4)',
                    width:`${progress}%`, transition:'width 0.1s linear',
                  }}/>
              }
            </div>
          </div>
        )}

        {/* Main button — clear active vs inactive */}
        <button onClick={toggle} style={{
          width:'100%', padding:'11px 0',
          background: active ? 'rgba(255,255,255,0.92)' : 'transparent',
          border:'0.5px solid rgba(255,255,255,0.5)',
          color: active ? '#000' : 'rgba(255,255,255,0.5)',
          fontFamily:'Helvetica Neue,Arial,sans-serif',
          fontSize:'9px', letterSpacing:'0.22em',
          cursor:'pointer', transition:'all 0.25s',
          fontWeight: active ? '500' : '400',
        }}>
          {active ? '◉  STOP AI LOOP' : '○  START AI LOOP'}
        </button>

      </div>
    </div>
  )
}
