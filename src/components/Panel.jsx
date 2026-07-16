import { useRef, useState, useCallback } from 'react'
import { useStore } from '../store'
import { analyseFabric, fileToBase64, imageUrlToBase64, InvalidAnalysisError } from '../utils/analyseFabric'
import { PRESETS } from '../data/presets'

function Slider({ label, storeKey }) {
  const val = useStore(s => s[storeKey])
  const setUni = useStore(s => s.setUniform)
  return (
    <div className="slider-row">
      <div className="slider-label">
        <span>{label}</span>
        <span className="slider-val">{val.toFixed(2)}</span>
      </div>
      <input type="range" min="0" max="1" step="0.01" value={val}
        onChange={e => setUni(storeKey, parseFloat(e.target.value))}
        className="slider" />
    </div>
  )
}

function ParamBar({ label, value }) {
  return (
    <div className="param-bar-row">
      <span className="param-bar-label">{label}</span>
      <div className="param-bar-track">
        <div className="param-bar-fill" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
      <span className="param-bar-val">{value.toFixed(2)}</span>
    </div>
  )
}

const SOURCE_TAG = {
  LIVE: '● LIVE',
  CACHED: '◌ CACHED',
  FALLBACK: '△ FALLBACK',
}

const SOURCE_TITLE = {
  LIVE: 'parameters from live Claude Vision response',
  CACHED: 'parameters from cached analysis',
  FALLBACK: 'last valid parameters kept — invalid response rejected',
}

export default function Panel() {
  const fileRef = useRef()
  const [collapsed, setCollapsed] = useState(false)
  const [text, setText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  // Provenance of the current parameters + the exact JSON payload applied.
  // Initial values mirror the silk cached params seeded in the store.
  const [source, setSource] = useState('CACHED')
  const [rawJson, setRawJson] = useState(() => JSON.stringify(PRESETS[0].params, null, 2))

  const uploadedImage  = useStore(s => s.uploadedImage)
  const analysisResult = useStore(s => s.analysisResult)
  const isAnalysing    = useStore(s => s.isAnalysing)
  const analysisError  = useStore(s => s.analysisError)
  const color          = useStore(s => s.color)
  const analysisHistory = useStore(s => s.analysisHistory)

  const setUploadedImage = useStore(s => s.setUploadedImage)
  const setAnalysing     = useStore(s => s.setAnalysing)
  const applyAnalysis    = useStore(s => s.applyAnalysis)
  const setAnalysisError = useStore(s => s.setAnalysisError)
  const setDescription   = useStore(s => s.setDescription)

  const colorHex = '#' + color.map(c => Math.round(c * 255).toString(16).padStart(2,'0')).join('')

  const applyWithJson = useCallback((params, src) => {
    applyAnalysis(params)
    setRawJson(JSON.stringify(params, null, 2))
    setSource(src)
  }, [applyAnalysis])

  const runAnalysis = useCallback(async (params) => {
    setAnalysing(true)
    try {
      applyWithJson(await analyseFabric(params), 'LIVE')
    } catch (err) {
      if (err instanceof InvalidAnalysisError) {
        // Contract violation: keep the last valid parameter set, just flag it
        setAnalysing(false)
        setSource('FALLBACK')
      } else {
        setAnalysisError(err.message)
      }
    }
  }, [setAnalysing, applyWithJson, setAnalysisError])

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    try {
      const { base64, mediaType } = await fileToBase64(file)
      setUploadedImage(`data:${mediaType};base64,${base64}`)
      await runAnalysis({ imageBase64: base64, mediaType, description: text })
    } catch (err) {
      setAnalysisError(err.message)
    }
  }, [text, setUploadedImage, runAnalysis, setAnalysisError])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault(); setDragOver(false)
    await handleFile(e.dataTransfer.files?.[0])
  }, [handleFile])

  // Swatch: cached params apply instantly, then the swatch image runs through
  // the same downscale + analyse pipeline as an upload. Live result silently
  // replaces the cache (LIVE); API failure keeps the cache (CACHED); a
  // contract violation keeps the last valid set (FALLBACK).
  const handlePreset = useCallback(async (preset) => {
    setText('')
    setDescription('')
    setUploadedImage(preset.image)
    applyWithJson(preset.params, 'CACHED')
    setAnalysing(true)
    try {
      const { base64, mediaType } = await imageUrlToBase64(preset.image)
      applyWithJson(await analyseFabric({ imageBase64: base64, mediaType }), 'LIVE')
    } catch (err) {
      setAnalysing(false)
      setSource(err instanceof InvalidAnalysisError ? 'FALLBACK' : 'CACHED')
    }
  }, [setDescription, setUploadedImage, applyWithJson, setAnalysing])

  return (
    <>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          position: 'fixed', right: collapsed ? 0 : 220, top: '50%',
          transform: 'translateY(-50%)',
          width: 16, height: 48,
          background: 'rgba(0,0,0,0.6)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRight: collapsed ? '0.5px solid rgba(255,255,255,0.1)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 20,
          fontSize: '8px', color: 'rgba(255,255,255,0.4)',
          transition: 'right 0.3s',
          letterSpacing: 0,
        }}
      >
        {collapsed ? '‹' : '›'}
      </div>
      <div
        className="panel"
        style={{
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? 'none' : 'auto',
          transition: 'opacity 0.3s',
          minWidth: 220,
        }}
      >
      <section className="panel-section">
        <div className="section-label">SWATCHES</div>
        <div className="preset-row">
          {PRESETS.map(p => (
            <button key={p.id} className="preset" onClick={() => handlePreset(p)} disabled={isAnalysing}>
              <img className="preset-swatch" src={p.image} alt={`${p.label} swatch`} />
              <span className="preset-label">{p.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-label">INPUT</div>
        <div
          className={`drop-zone${uploadedImage?' has-image':''}${dragOver?' drag-over':''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={e=>{e.preventDefault();setDragOver(true)}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploadedImage
            ? <img src={uploadedImage} alt="fabric" className="drop-preview" />
            : <div className="drop-text">DROP FABRIC IMAGE<br/>OR CLICK TO UPLOAD</div>
          }
        </div>
        {isAnalysing && (
          <div style={{marginTop:8}}>
            <div style={{
              fontSize:'8px', letterSpacing:'0.16em',
              color:'rgba(255,255,255,0.35)', marginBottom:5
            }}>CLAUDE ANALYSING...</div>
            <div style={{
              width:'100%', height:'1px', background:'#111',
              position:'relative', overflow:'hidden'
            }}>
              <div style={{
                position:'absolute', top:0, height:'1px',
                background:'rgba(255,255,255,0.6)',
                animation:'shimmer 1.4s ease-in-out infinite',
                width:'45%',
              }}/>
            </div>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}}
          onChange={async e => { await handleFile(e.target.files?.[0]); e.target.value='' }} />
        <div className="text-input-row">
          <input type="text" className="text-input" placeholder="DESCRIBE MATERIAL..."
            value={text} onChange={e=>{ setText(e.target.value); setDescription(e.target.value) }}
            onKeyDown={e=>e.key==='Enter'&&runAnalysis({description:text})} />
          <button className="btn" onClick={()=>runAnalysis({description:text})}
            disabled={isAnalysing||!text.trim()}>→</button>
        </div>
        {analysisError && <div className="status error" style={{marginTop:8}}>✕ {analysisError}</div>}
      </section>

      <section className="panel-section">
        <div className="section-label">UNIFORMS</div>
        <Slider label="RIGIDITY" storeKey="rigidity" />
        <Slider label="FLOW"     storeKey="flow" />
        <Slider label="SPECULAR" storeKey="specular" />
        <div className="color-row">
          <span className="slider-label-text">COLOR</span>
          <div className="color-swatch" style={{background:colorHex}} />
          <span className="color-hex">{colorHex.toUpperCase()}</span>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-label">
          CLAUDE ANALYSIS
          {source && (
            <span title={SOURCE_TITLE[source]}
              style={{ float:'right', color:'rgba(255,255,255,0.45)', letterSpacing:'0.2em' }}>
              {SOURCE_TAG[source]}
            </span>
          )}
        </div>
        {analysisResult ? (
          <>
            <ParamBar label="RIGIDITY" value={analysisResult.rigidity} />
            <ParamBar label="FLOW"     value={analysisResult.flow} />
            <ParamBar label="SPECULAR" value={analysisResult.specular} />
            <div className="color-row" style={{marginTop:10}}>
              <span className="slider-label-text">DETECTED</span>
              <div className="color-swatch" style={{background:colorHex}} />
              <span className="color-hex">{colorHex.toUpperCase()}</span>
            </div>
            {rawJson && (
              <>
                <pre className="raw-json">{rawJson}</pre>
                <div className="uniform-map">
                  rigidity → uRigidity · flow → uFlow · specular → uSpecular · color → uColor
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ fontSize: '8px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.28)', lineHeight: 1.7 }}>
            NO ANALYSIS YET — PICK A SWATCH OR USE INPUT ABOVE
          </div>
        )}
      </section>

      {analysisHistory.length > 1 && (
        <section className="panel-section">
          <div className="section-label">MEMORY · {analysisHistory.length} STATES</div>
          {analysisHistory.map((s, i) => (
            <div key={s.timestamp} style={{
              marginBottom: 8, opacity: 1 - i * 0.25,
              borderLeft: `0.5px solid rgba(255,255,255,${0.3 - i * 0.1})`,
              paddingLeft: 8,
            }}>
              <div style={{ fontSize: '8px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>
                STATE {i + 1} {i === 0 ? '· CURRENT' : ''}
              </div>
              <div style={{ fontSize: '8px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)' }}>
                R:{s.rigidity.toFixed(2)} F:{s.flow.toFixed(2)} S:{s.specular.toFixed(2)}
              </div>
            </div>
          ))}
          <div style={{ fontSize: '8px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
            MORPHING BETWEEN STATES →
          </div>
        </section>
      )}

      <section className="panel-section">
        <div className="section-label">INTERACTION</div>
        <div className="instructions">
          <div>DRAG → ORBIT</div>
          <div>SCROLL → ZOOM</div>
          <div>MOUSE → BEND MESH</div>
          <div>SLIDERS → LIVE UNIFORMS</div>
        </div>
      </section>
      </div>
    </>
  )
}
