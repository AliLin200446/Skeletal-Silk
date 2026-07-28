import { useRef, useState, useCallback } from 'react'
import { useStore } from '../store'
import {
  analyseFabric, fileToBase64, imageUrlToBase64,
  InvalidAnalysisError, RateLimitedError,
} from '../utils/analyseFabric'
import { PRESETS } from '../data/presets'
import TESTED_ON from '../data/tested-on.json'

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

  // No silent rejections: a wrong file type or an oversized image used to
  // return quietly here, so a user who dropped a PDF saw nothing happen at
  // all. fileToBase64 validates and throws a readable message instead.
  const handleFile = useCallback(async (file) => {
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
      if (err instanceof RateLimitedError) {
        // Cached values are already showing, so this is a note, not a failure.
        setAnalysisError(err.message)
      } else {
        setSource(err instanceof InvalidAnalysisError ? 'FALLBACK' : 'CACHED')
      }
    }
  }, [setDescription, setUploadedImage, applyWithJson, setAnalysing, setAnalysisError])

  return (
    <>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          position: 'fixed', right: collapsed ? 0 : 236, top: '50%',
          transform: 'translateY(-50%)',
          width: 16, height: 48,
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRight: collapsed ? '1px solid var(--rule)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 20,
          fontSize: '9px', color: 'var(--ink-mid)',
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
      {/* The vision→parameters→shader step is the whole mechanism, so it
          leads the panel rather than sitting in a corner readout. Stacked
          vertically because the panel is 220px wide. */}
      <section className="panel-section">
        <div className="section-label">PIPELINE</div>
        <div className="flow">
          <div className="flow-step">
            {uploadedImage
              ? <img src={uploadedImage} alt="current input" className="flow-thumb" />
              : <div className="flow-thumb flow-thumb-empty">—</div>}
            <div className="flow-body">
              <div className="flow-title">YOUR PHOTO</div>
              <div className="flow-sub">{uploadedImage ? 'sent to Claude Vision' : 'upload or pick a swatch'}</div>
            </div>
          </div>
          <div className="flow-arrow">↓</div>
          <div className="flow-step">
            <div className="flow-nums">
              {analysisResult
                ? [analysisResult.rigidity, analysisResult.flow, analysisResult.specular]
                    .map((v, i) => <span key={i}>{v.toFixed(2)}</span>)
                : <span>—</span>}
              <span className="flow-chip" style={{ background: colorHex }} />
            </div>
            <div className="flow-body">
              <div className="flow-title">CLAUDE READS</div>
              <div className="flow-sub">4 constrained numbers</div>
            </div>
          </div>
          <div className="flow-arrow">↓</div>
          <div className="flow-step">
            <div className="flow-uniforms">uRigidity<br />uFlow<br />uSpecular<br />uColor</div>
            <div className="flow-body">
              <div className="flow-title">SHADER</div>
              <div className="flow-sub">rendering live, left</div>
            </div>
          </div>
        </div>
      </section>

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
              fontSize:'9px', letterSpacing:'0.16em',
              color:'var(--ink-mid)', marginBottom:5
            }}>CLAUDE ANALYSING...</div>
            <div style={{
              width:'100%', height:'1px', background:'var(--rule)',
              position:'relative', overflow:'hidden'
            }}>
              <div style={{
                position:'absolute', top:0, height:'1px',
                background:'var(--ink)',
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
        {/* Honest boundary: the model classifies whatever it is given. An ink
            line drawing returns rigidity 0.92 as confidently as real leather. */}
        <div className="boundary-note">
          Assumes the input is a material. It reads properties — it does not
          verify the photo is fabric, and will answer confidently for a
          drawing or a landscape.
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
              style={{ float:'right', color:'var(--ink-mid)', letterSpacing:'0.2em' }}>
              {SOURCE_TAG[source]}
            </span>
          )}
        </div>
        {source === 'CACHED' && (
          <div className="source-note">stored values — upload a photo to run Claude on it</div>
        )}
        {source === 'LIVE' && (
          <div className="source-note">read from your image just now</div>
        )}
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
                <div className="uniform-map-label">the model&rsquo;s reading, wired straight to the shader&rsquo;s uniforms</div>
                <div className="uniform-map">
                  rigidity → uRigidity · flow → uFlow · specular → uSpecular · color → uColor
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'var(--ink-dim)', lineHeight: 1.7 }}>
            NO ANALYSIS YET — PICK A SWATCH OR USE INPUT ABOVE
          </div>
        )}
      </section>

      {/* Two photographs of similar colour but opposite structure. Divergent
          numbers are the evidence it reads properties rather than converging.
          Values are unedited API output — see data/tested-on.json. */}
      <section className="panel-section">
        <div className="section-label">TESTED ON</div>
        <div className="tested-head">
          <span />
          <span>RIG</span><span>FLW</span><span>SPC</span>
        </div>
        {TESTED_ON.photographs.map((r) => (
          <div className="tested-row" key={r.label}>
            <span className="tested-label">{r.label}<em>{r.note}</em></span>
            <span>{r.rigidity.toFixed(2)}</span>
            <span>{r.flow.toFixed(2)}</span>
            <span>{r.specular.toFixed(2)}</span>
          </div>
        ))}
        <div className="tested-note">
          Photographs separate sharply — same red hue family, inverted
          rigidity and flow.
        </div>

        {/* The control group. These converge, and saying so is the point:
            it shows what the tool discriminates on and what it cannot. */}
        <div className="tested-subhead">SOLID-COLOUR SWATCHES · CONTROL</div>
        {TESTED_ON.swatches.map((r) => (
          <div className="tested-row tested-row-muted" key={r.label}>
            <span className="tested-label">{r.label}<em>{r.note}</em></span>
            <span>{r.rigidity.toFixed(2)}</span>
            <span>{r.flow.toFixed(2)}</span>
            <span>{r.specular.toFixed(2)}</span>
          </div>
        ))}
        <div className="tested-note">
          Silk and linen return identical values and denim is within 0.04.
          With no weave in the image there is only hue to read. Real fabric
          photographs are the fix.
        </div>
      </section>

      {analysisHistory.length > 1 && (
        <section className="panel-section">
          <div className="section-label">MEMORY · {analysisHistory.length} STATES</div>
          {analysisHistory.map((s, i) => (
            <div key={s.timestamp} style={{
              marginBottom: 8, opacity: 1 - i * 0.25,
              borderLeft: `1px solid var(--rule-strong)`,
              paddingLeft: 8,
            }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.12em', color: 'var(--ink-dim)', marginBottom: 3 }}>
                STATE {i + 1} {i === 0 ? '· CURRENT' : ''}
              </div>
              <div style={{ fontSize: '9px', letterSpacing: '0.1em', color: 'var(--ink-mid)' }}>
                R:{s.rigidity.toFixed(2)} F:{s.flow.toFixed(2)} S:{s.specular.toFixed(2)}
              </div>
            </div>
          ))}
          <div style={{ fontSize: '9px', letterSpacing: '0.14em', color: 'var(--ink-dim)', marginTop: 4 }}>
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
