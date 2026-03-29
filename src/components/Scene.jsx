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
        camera={{position:[0,0,5.8],fov:36}}
        gl={{antialias:true,alpha:true,preserveDrawingBuffer:true}}
        style={{background:'transparent'}}
      >
        <ambientLight intensity={0.05}/>
        <SkeletalMesh/>
        <BoneParticles/>
        <OrbitControls enableZoom enablePan={false} minDistance={2} maxDistance={8} rotateSpeed={0.4} dampingFactor={0.08} enableDamping/>
      </Canvas>

      <div style={{
        position:'absolute', bottom:32, left:'50%',
        transform:'translateX(-50%)',
        display:'flex', flexDirection:'column',
        alignItems:'center', gap:10, width:200,
        fontFamily:'DM Mono, Courier New, monospace',
      }}>

        {/* Progress — only when active */}
        {active && (
          <div style={{width:'100%'}}>
            <div style={{
              display:'flex', justifyContent:'space-between',
              fontSize:7, letterSpacing:'0.2em', marginBottom:6,
              color: generating ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
            }}>
              <span>{generating ? '◉ GENERATING' : '◎ NEXT IN'}</span>
              <span style={{fontVariantNumeric:'tabular-nums'}}>
                {generating ? '···' : `${Math.round(100 - progress)}%`}
              </span>
            </div>
            <div style={{
              width:'100%', height:'1px',
              background:'rgba(255,255,255,0.08)',
              position:'relative', overflow:'hidden',
            }}>
              {generating
                ? <div style={{
                    position:'absolute', top:0, height:'1px',
                    background:'rgba(255,255,255,0.5)',
                    animation:'shimmer 1s ease-in-out infinite',
                    width:'40%',
                  }}/>
                : <div style={{
                    height:'1px',
                    background:'rgba(255,255,255,0.35)',
                    width:`${progress}%`,
                    transition:'width 0.1s linear',
                  }}/>
              }
            </div>
          </div>
        )}

        {/* Button */}
        <button onClick={toggle} style={{
          width:'100%',
          padding:'12px 0',
          background: active
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: active
            ? '0.5px solid rgba(255,255,255,0.9)'
            : '0.5px solid rgba(255,255,255,0.25)',
          color: active ? '#000' : 'rgba(255,255,255,0.5)',
          fontFamily: 'DM Mono, Courier New, monospace',
          fontSize: 8,
          letterSpacing: '0.24em',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          fontWeight: active ? '500' : '300',
        }}>
          {active ? '◉  STOP AI LOOP' : '○  START AI LOOP'}
        </button>

      </div>
    </div>
  )
}
