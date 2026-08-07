import { useRef, useState, useCallback, useEffect } from 'react'
import { useStore, selectPrimary, selectImageSrc } from '../store'
import {
  analyseFabric, fileToBase64, imageUrlToBase64,
  InvalidAnalysisError,
} from '../utils/analyseFabric'
import {
  beginRequest, endRequest, isLive, cancelRequest,
  RateLimitedError, AnalysisCancelledError, MAX_CONCURRENT,
} from '../utils/requests'
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

  const layers = useStore((s) => s.layers)
  const pushHistory = useStore((s) => s.pushHistory)
  const setDescription = useStore((s) => s.setDescription)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)

  // Transient, and deliberately not in any snapshot. Undo aborting requests is
  // a real consequence with a cost attached, and the only moment a user can
  // connect it to the cause is the moment it happens.
  const [timeNote, setTimeNote] = useState(null)

  const primaryImage = selectImageSrc({ images }, primary)
  const busy = primary?.status === 'analysing'
  // Counted off the layers rather than the request map so it re-renders on its
  // own. The two cannot drift: a layer is 'analysing' exactly while it owns a
  // live requestId.
  const running = layers.filter((l) => l.status === 'analysing').length

  // Analysis targets the selected layer. Swatches and uploads replace that
  // layer's image; "+ ADD LAYER" is the only way to grow the board, so a
  // click never silently creates a sample you did not ask for.
  const runOnPrimary = useCallback(async (payload, cachedParams) => {
    if (!primary) return
    const id = primary.id

    let requestId, controller
    try {
      ({ requestId, controller } = beginRequest(id))
    } catch (err) {
      // Refused before any money was spent. Not an error state for the layer.
      patchLayer(id, { status: 'idle', error: err.message })
      return
    }

    // No pushHistory here. The snapshot point for an action is the moment
    // before it changes anything visible, and by the time this function runs
    // the caller has already written the layer's name and thumbnail. Pushing
    // here recorded a half-applied swatch click: COTTON's name and image with
    // the previous numbers, a state no sequence of user actions can produce.
    // Each entry point pushes before its first visible write instead.
    if (cachedParams) applyAnalysis(id, cachedParams, 'CACHED')
    patchLayer(id, { status: 'analysing', requestId, error: null })

    // Three questions, all of which must still be yes before a response is
    // allowed to write anything. They fail for three different reasons and one
    // check cannot cover the others:
    //   1. the request is still live      — it was not cancelled while open
    //   2. the layer still exists         — it was not removed while open
    //   3. the layer still owns this id   — a newer request did not replace it
    // Without these, a slow response from a deleted or re-analysed layer lands
    // on whatever is sitting in that slot now.
    //
    // Only check 1 has ever fired. Verified 2026-08-07 by fault injection:
    // suppressing the abort so a real 200 came back 2.4s after a cancel, the
    // response was refused and specular stayed at the cached 0.12 where the
    // arriving body carried 0.18. Checks 2 and 3 are untested code, see below.
    const mayLand = () => {
      if (!isLive(requestId)) return null
      const layer = useStore.getState().layers.find((l) => l.id === id)
      // NEVER FIRED as of 2026-08-07, and now with a reason rather than a
      // guess. Every path that removes a layer aborts its request first:
      // removeLayer calls cancelLayer, and undo calls cancelAll. Both abort
      // with AnalysisCancelledError, and the catch below returns on that error
      // before mayLand is consulted, so the abort path and the cancel path
      // converge on the same early return. Step 4's undo was expected to reach
      // this check and does not, for exactly that reason.
      //
      // What would make it reachable: a layer disappearing without its request
      // being aborted, or an abort that does not carry AnalysisCancelledError.
      if (!layer) return null
      // NEVER FIRED as of 2026-08-07. Step 5's batch edit was expected to open
      // this and does not. Checked after building it: there is exactly one
      // beginRequest call site, here, and it targets primary.id, the first
      // selected layer. Multi-select widens which layers a UNIFORM edit writes
      // to; it does not widen which layers get analysed, and setSelectedParam
      // touches params only, never requestId. So a layer still cannot hold two
      // live requests and this can still never disagree.
      //
      // What would make it reachable: analysing a whole selection at once, or
      // any second beginRequest call site that can target a busy layer.
      if (layer.requestId !== requestId) return null
      return layer
    }

    try {
      const params = await analyseFabric({ ...payload, controller })
      if (!mayLand()) return
      applyAnalysis(id, params, 'LIVE')
    } catch (err) {
      if (err instanceof AnalysisCancelledError) return   // the cancel already set the state
      if (!mayLand()) return
      if (err instanceof InvalidAnalysisError) {
        patchLayer(id, { status: 'idle', source: 'FALLBACK', requestId: null })
      } else if (err instanceof RateLimitedError) {
        patchLayer(id, { status: 'idle', error: err.message, requestId: null })
      } else {
        patchLayer(id, { status: 'error', error: err.message, requestId: null })
      }
    } finally {
      endRequest(requestId)
    }
  }, [primary, applyAnalysis, patchLayer])

  const cancelPrimary = useCallback(() => {
    if (!primary?.requestId) return
    // Order matters: mark the layer first. cancelRequest aborts the fetch, and
    // the rejection handler reads this layer to decide whether to write.
    patchLayer(primary.id, { status: 'cancelled', requestId: null, error: null })
    cancelRequest(primary.requestId)
  }, [primary, patchLayer])

  const handlePreset = useCallback(async (preset) => {
    if (!primary) return
    // Before the first visible write. The name and thumbnail change here, so
    // the snapshot has to precede them or undo leaves the identity behind.
    pushHistory()
    setText('')
    const imageId = putImage(preset.image)
    patchLayer(primary.id, { imageId, description: preset.label.toLowerCase() })
    try {
      const { base64, mediaType } = await imageUrlToBase64(preset.image)
      await runOnPrimary({ imageBase64: base64, mediaType }, preset.params)
    } catch (err) {
      patchLayer(primary.id, { status: 'error', error: err.message })
    }
  }, [primary, putImage, patchLayer, runOnPrimary, pushHistory])

  // No silent rejections: a wrong file type or an oversized image throws a
  // readable message rather than returning quietly.
  const handleFile = useCallback(async (file) => {
    if (!primary) return
    try {
      // After validation, before the first visible write: a rejected file
      // changes nothing, so it must not leave an undo entry behind.
      const { base64, mediaType } = await fileToBase64(file)
      pushHistory()
      const imageId = putImage(`data:${mediaType};base64,${base64}`)
      patchLayer(primary.id, { imageId })
      await runOnPrimary({ imageBase64: base64, mediaType, description: text })
    } catch (err) {
      patchLayer(primary.id, { status: 'error', error: err.message })
    }
  }, [primary, text, putImage, patchLayer, runOnPrimary, pushHistory])

  // No push here. The text path's first visible write is the first keystroke,
  // not the submit, and setDescription already opened the entry there.
  const submitText = useCallback(() => {
    if (!text.trim()) return
    runOnPrimary({ description: text })
  }, [text, runOnPrimary])

  const travel = useCallback((fn, label) => {
    const { moved, aborted } = fn()
    if (!moved) return
    setTimeNote(aborted
      ? `${label} CANCELLED ${aborted} ANALYS${aborted === 1 ? 'IS' : 'ES'} IN FLIGHT`
      : null)
  }, [])

  useEffect(() => {
    if (!timeNote) return
    const t = setTimeout(() => setTimeNote(null), 4000)
    return () => clearTimeout(t)
  }, [timeNote])

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      if (e.target instanceof HTMLInputElement) return
      e.preventDefault()
      if (e.shiftKey) travel(redo, 'REDO')
      else travel(undo, 'UNDO')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, travel])

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
          <div className="history-row">
            <button className="btn" disabled={!canUndo} onClick={() => travel(undo, 'UNDO')}>UNDO</button>
            <button className="btn" disabled={!canRedo} onClick={() => travel(redo, 'REDO')}>REDO</button>
          </div>
          {timeNote && <div className="status muted" style={{ marginTop: 6 }}>· {timeNote}</div>}
        </section>

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
              <div className="analysing-head">
                <span>CLAUDE ANALYSING... {running} / {MAX_CONCURRENT}</span>
                <button className="link-btn" onClick={cancelPrimary}>CANCEL</button>
              </div>
              <div style={{ width: '100%', height: '1px', background: 'var(--rule)', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', top: 0, height: '1px', background: 'var(--ink)',
                  animation: 'shimmer 1.4s ease-in-out infinite', width: '45%',
                }} />
              </div>
            </div>
          )}

          {primary?.status === 'cancelled' && (
            <div className="status muted" style={{ marginTop: 8 }}>
              ⊘ ANALYSIS CANCELLED — NO LIVE READING LANDED
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={async (e) => { await handleFile(e.target.files?.[0]); e.target.value = '' }} />

          <div className="text-input-row">
            <input type="text" className="text-input" placeholder="DESCRIBE MATERIAL..."
              value={text}
              onChange={(e) => { setText(e.target.value); if (primary) setDescription(primary.id, e.target.value) }}
              onKeyDown={(e) => e.key === 'Enter' && submitText()} />
            <button className="btn" onClick={submitText}
              disabled={busy || !text.trim()}>→</button>
          </div>

          {/* Honest boundary: the model classifies whatever it is given. An ink
              line drawing returns rigidity 0.92 as confidently as real leather. */}
          <div className="boundary-note">
            Assumes the input is a material. It reads properties, it does not
            verify the photo is fabric, and will answer confidently for a
            drawing or a landscape.
          </div>

          {/* A refusal is not a failure. Being told to wait 2 seconds, or that
              three analyses are already running, leaves the layer idle and
              nothing broken, so it does not get to use the oxblood. */}
          {primary?.error && (
            primary.status === 'error'
              ? <div className="status error" style={{ marginTop: 8 }}>✕ {primary.error}</div>
              : <div className="status muted" style={{ marginTop: 8 }}>· {primary.error}</div>
          )}
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
            <div>CMD Z / SHIFT → UNDO, REDO</div>
          </div>
        </section>
      </div>
    </>
  )
}
