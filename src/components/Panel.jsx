import { useRef, useState, useCallback } from 'react'
import { useStore, selectPrimary, selectImageSrc } from '../store'
import {
  analyseFabric, fileToBase64, imageUrlToBase64,
  InvalidAnalysisError, RateLimitedError,
} from '../utils/analyseFabric'
import { PRESETS } from '../data/presets'
import TESTED_ON from '../data/tested-on.json'
import LayerList from './LayerList'
import LayerInspector from './LayerInspector'

export default function Panel() {
  const fileRef = useRef()
  const [collapsed, setCollapsed] = useState(false)
  const [text, setText] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const primary = useStore(selectPrimary)
  const images = useStore((s) => s.images)
  const putImage = useStore((s) => s.putImage)
  const patchLayer = useStore((s) => s.patchLayer)
  const applyAnalysis = useStore((s) => s.applyAnalysis)

  const primaryImage = selectImageSrc({ images }, primary)
  const busy = primary?.status === 'analysing'

  // Analysis targets the selected layer. Swatches and uploads replace that
  // layer's image; "+ ADD LAYER" is the only way to grow the board, so a
  // click never silently creates a sample you did not ask for.
  const runOnPrimary = useCallback(async (payload, cachedParams) => {
    if (!primary) return
    const id = primary.id
    if (cachedParams) applyAnalysis(id, cachedParams, 'CACHED')
    patchLayer(id, { status: 'analysing', error: null })
    try {
      const params = await analyseFabric(payload)
      applyAnalysis(id, params, 'LIVE')
    } catch (err) {
      if (err instanceof InvalidAnalysisError) {
        patchLayer(id, { status: 'idle', source: 'FALLBACK' })
      } else if (err instanceof RateLimitedError) {
        patchLayer(id, { status: 'idle', error: err.message })
      } else {
        patchLayer(id, { status: 'error', error: err.message })
      }
    }
  }, [primary, applyAnalysis, patchLayer])

  const handlePreset = useCallback(async (preset) => {
    if (!primary) return
    setText('')
    const imageId = putImage(preset.image)
    patchLayer(primary.id, { imageId, description: preset.label.toLowerCase() })
    try {
      const { base64, mediaType } = await imageUrlToBase64(preset.image)
      await runOnPrimary({ imageBase64: base64, mediaType }, preset.params)
    } catch (err) {
      patchLayer(primary.id, { status: 'error', error: err.message })
    }
  }, [primary, putImage, patchLayer, runOnPrimary])

  // No silent rejections: a wrong file type or an oversized image throws a
  // readable message rather than returning quietly.
  const handleFile = useCallback(async (file) => {
    if (!primary) return
    try {
      const { base64, mediaType } = await fileToBase64(file)
      const imageId = putImage(`data:${mediaType};base64,${base64}`)
      patchLayer(primary.id, { imageId })
      await runOnPrimary({ imageBase64: base64, mediaType, description: text })
    } catch (err) {
      patchLayer(primary.id, { status: 'error', error: err.message })
    }
  }, [primary, text, putImage, patchLayer, runOnPrimary])

  const handleDrop = useCallback(async (e) => {
    e.preventDefault(); setDragOver(false)
    await handleFile(e.dataTransfer.files?.[0])
  }, [handleFile])

  return (
    <>
      <div
        onClick={() => setCollapsed((c) => !c)}
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
        {/* The vision to parameters step is the whole mechanism, so it leads
            the panel rather than sitting in a corner readout. */}
        <section className="panel-section">
          <div className="section-label">PIPELINE</div>
          <div className="flow">
            <div className="flow-step">
              {primaryImage
                ? <img src={primaryImage} alt="current input" className="flow-thumb" />
                : <div className="flow-thumb flow-thumb-empty">{'—'}</div>}
              <div className="flow-body">
                <div className="flow-title">YOUR PHOTO</div>
                <div className="flow-sub">{primaryImage ? 'sent to Claude Vision' : 'upload or pick a swatch'}</div>
              </div>
            </div>
            <div className="flow-arrow">↓</div>
            <div className="flow-step">
              <div className="flow-nums">
                {primary
                  ? [primary.params.rigidity, primary.params.flow, primary.params.specular]
                      .map((v, i) => <span key={i}>{v.toFixed(2)}</span>)
                  : <span>{'—'}</span>}
                <span className="flow-chip" style={{
                  background: primary
                    ? '#' + primary.params.color.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
                    : 'transparent',
                }} />
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

        <LayerList />

        <section className="panel-section">
          <div className="section-label">SWATCHES</div>
          <div className="preset-row">
            {PRESETS.map((p) => (
              <button key={p.id} className="preset" onClick={() => handlePreset(p)} disabled={busy}>
                <img className="preset-swatch" src={p.image} alt={`${p.label} swatch`} />
                <span className="preset-label">{p.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-label">INPUT</div>
          <div
            className={`drop-zone${primaryImage ? ' has-image' : ''}${dragOver ? ' drag-over' : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {primaryImage
              ? <img src={primaryImage} alt="fabric" className="drop-preview" />
              : <div className="drop-text">DROP FABRIC IMAGE<br />OR CLICK TO UPLOAD</div>}
          </div>

          {busy && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: '9px', letterSpacing: '0.16em', color: 'var(--ink-mid)', marginBottom: 5 }}>
                CLAUDE ANALYSING...
              </div>
              <div style={{ width: '100%', height: '1px', background: 'var(--rule)', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', top: 0, height: '1px', background: 'var(--ink)',
                  animation: 'shimmer 1.4s ease-in-out infinite', width: '45%',
                }} />
              </div>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={async (e) => { await handleFile(e.target.files?.[0]); e.target.value = '' }} />

          <div className="text-input-row">
            <input type="text" className="text-input" placeholder="DESCRIBE MATERIAL..."
              value={text}
              onChange={(e) => { setText(e.target.value); if (primary) patchLayer(primary.id, { description: e.target.value }) }}
              onKeyDown={(e) => e.key === 'Enter' && text.trim() && runOnPrimary({ description: text })} />
            <button className="btn" onClick={() => runOnPrimary({ description: text })}
              disabled={busy || !text.trim()}>→</button>
          </div>

          {/* Honest boundary: the model classifies whatever it is given. An ink
              line drawing returns rigidity 0.92 as confidently as real leather. */}
          <div className="boundary-note">
            Assumes the input is a material. It reads properties, it does not
            verify the photo is fabric, and will answer confidently for a
            drawing or a landscape.
          </div>

          {primary?.error && <div className="status error" style={{ marginTop: 8 }}>✕ {primary.error}</div>}
        </section>

        <LayerInspector />

        {/* Unedited API output, see data/tested-on.json. */}
        <section className="panel-section">
          <div className="section-label">TESTED ON</div>
          <div className="tested-head">
            <span />
            <span>RIG</span><span>FLW</span><span>SPC</span>
          </div>
          {TESTED_ON.fabrics.map((r) => (
            <div className="tested-row" key={r.label}>
              <span className="tested-label">{r.label}<em>{r.note}</em></span>
              <span>{r.rigidity.toFixed(2)}</span>
              <span>{r.flow.toFixed(2)}</span>
              <span>{r.specular.toFixed(2)}</span>
            </div>
          ))}
          <div className="tested-subhead">FLAT SWATCH · CONTROL</div>
          {TESTED_ON.control.map((r) => (
            <div className="tested-row tested-row-muted" key={r.label}>
              <span className="tested-label">{r.label}<em>{r.note}</em></span>
              <span>{r.rigidity.toFixed(2)}</span>
              <span>{r.flow.toFixed(2)}</span>
              <span>{r.specular.toFixed(2)}</span>
            </div>
          ))}
          <div className="tested-note">
            Brocade separates on all three. Knit and cotton share a physical
            reading and are told apart only by colour. The flat control
            returns a generic mid answer, which is what no texture looks like.
          </div>
        </section>

        <section className="panel-section">
          <div className="section-label">INTERACTION</div>
          <div className="instructions">
            <div>CLICK → SELECT LAYER</div>
            <div>SHIFT / CMD → MULTI-SELECT</div>
            <div>DRAG → ORBIT</div>
            <div>SLIDERS → LIVE GLSL UNIFORMS</div>
          </div>
        </section>
      </div>
    </>
  )
}
