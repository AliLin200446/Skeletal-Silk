import { useMemo, useState } from 'react'
import { useStore, selectPrimary } from '../store'
import Reveal from './Reveal'

// Whether the selected layers agree on a value. Without this the panel shows
// the first selected layer's number and says nothing about the rest, which
// reads as "all of them are 0.48" when it means "one of them is". Dragging
// still flattens them to a single value, because that is what a batch edit is;
// the point is that the readout should not claim they were already equal.
function useSelectedLayers() {
  const layers = useStore((s) => s.layers)
  const selectedIds = useStore((s) => s.selectedIds)
  return useMemo(
    () => layers.filter((l) => selectedIds.includes(l.id)),
    [layers, selectedIds],
  )
}

const MIXED = 'MIXED'

const readParam = (selected, key) => {
  if (!selected.length) return { value: 0, mixed: false }
  const first = selected[0].params[key]
  return { value: first, mixed: selected.some((l) => l.params[key] !== first) }
}

const hex = (color) =>
  '#' + color.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')

const SOURCE_TAG = {
  CACHED: '◌ CACHED',
  LIVE: '● LIVE',
  FALLBACK: '△ FALLBACK',
}

const SOURCE_TITLE = {
  CACHED: 'parameters from cached analysis',
  LIVE: 'parameters from live Claude Vision response',
  FALLBACK: 'last valid parameters kept — invalid response rejected',
}

function Slider({ label, paramKey, selected }) {
  const setSelectedParam = useStore((s) => s.setSelectedParam)
  const { value, mixed } = readParam(selected, paramKey)
  const count = selected.length
  return (
    <div className="slider-row">
      <div className="slider-label">
        <span>{label}{count > 1 ? ` · ${count}` : ''}</span>
        <span className={`slider-val${mixed ? ' is-mixed' : ''}`}>
          {mixed ? MIXED : value.toFixed(2)}
        </span>
      </div>
      {/* The thumb sits at the first selected layer's value even when mixed.
          There is no honest position for a disagreement, and parking it at
          zero would misreport more than it explains. */}
      <input type="range" min="0" max="1" step="0.01" value={value}
        onChange={(e) => setSelectedParam(paramKey, parseFloat(e.target.value))}
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

export default function LayerInspector() {
  const primary = useStore(selectPrimary)
  const selected = useSelectedLayers()
  // Local, and deliberately not in the store: which panes a reader has opened
  // is not part of the document and must never reach an undo snapshot.
  const [showRaw, setShowRaw] = useState(false)
  if (!primary) return null

  const selectedCount = selected.length
  const p = primary.params
  const colorHex = hex(p.color)
  const colorMixed = selected.some((l) => hex(l.params.color) !== colorHex)

  return (
    <>
      <section className="panel-section">
        <div className="section-label">
          UNIFORMS
          {selectedCount > 1 && <span className="layer-count">{selectedCount} SELECTED</span>}
        </div>
        {selectedCount > 1 && (
          <div className="source-note" style={{ marginTop: 0, marginBottom: 8 }}>
            edits apply to all {selectedCount}, as one undo step
          </div>
        )}
        <Slider label="RIGIDITY" paramKey="rigidity" selected={selected} />
        <Slider label="FLOW"     paramKey="flow"     selected={selected} />
        <Slider label="SPECULAR" paramKey="specular" selected={selected} />
        <div className="color-row">
          <span className="slider-label-text">COLOR</span>
          <div className="color-swatch" style={{ background: colorHex }} />
          <span className={`color-hex${colorMixed ? ' is-mixed' : ''}`}>
            {colorMixed ? MIXED : colorHex.toUpperCase()}
          </span>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-label">
          CLAUDE ANALYSIS
          <span title={SOURCE_TITLE[primary.source]}
            style={{ float: 'right', color: 'var(--ink-mid)', letterSpacing: '0.2em' }}>
            {SOURCE_TAG[primary.source]}
          </span>
        </div>
        {selectedCount > 1 && (
          <div className="source-note">reading of layer {primary.description ? primary.description.toUpperCase() : 'UNTITLED'} only, not the selection</div>
        )}
        {primary.source === 'CACHED' && (
          <div className="source-note">stored values — upload a photo to run Claude on it</div>
        )}
        {primary.source === 'LIVE' && !primary.keptKeys?.length && (
          <div className="source-note">read from your image just now</div>
        )}
        {!!primary.keptKeys?.length && (
          <div className="source-note">
            read from your image, except {primary.keptKeys.join(' and ').toUpperCase()},
            which you set by hand while it was reading
          </div>
        )}

        <ParamBar label="RIGIDITY" value={p.rigidity} />
        <ParamBar label="FLOW"     value={p.flow} />
        <ParamBar label="SPECULAR" value={p.specular} />
        <div className="color-row" style={{ marginTop: 10 }}>
          <span className="slider-label-text">DETECTED</span>
          <div className="color-swatch" style={{ background: colorHex }} />
          <span className="color-hex">{colorHex.toUpperCase()}</span>
        </div>

        {/* 311px of reference for a reader who wants to take the shader
            somewhere else. Everyone else has already got the answer from the
            three bars above it. On request rather than by default. */}
        <button className="link-btn disclosure" onClick={() => setShowRaw((v) => !v)}>
          {showRaw ? 'HIDE RAW RESPONSE' : 'SHOW RAW RESPONSE'}
        </button>
        <Reveal when={showRaw}>
          <div className="disclosure-body">
            <pre className="raw-json">{primary.rawJson}</pre>
            <div className="uniform-map-label">the model&rsquo;s reading, wired straight to the shader&rsquo;s uniforms</div>
            <div className="uniform-map">
              rigidity → uRigidity · flow → uFlow · specular → uSpecular · color → uColor
            </div>
          </div>
        </Reveal>
      </section>
    </>
  )
}
