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
    <section className="panel-section">
      <div className="section-label">
        UNIFORMS
        {selectedCount > 1
          ? <span className="layer-count">{selectedCount} SELECTED</span>
          : <span className="source-tag" title={SOURCE_TITLE[primary.source]}>
              {SOURCE_TAG[primary.source]}
            </span>}
      </div>

      {/* Where these three numbers came from, said once, on the heading of
          the numbers themselves.

          It used to be said in three places at once: this marker sat on the
          CLAUDE ANALYSIS heading over a second copy of the same figures, the
          wording under it explained the same thing again, and the pipeline's
          middle cell carried "nothing read yet" for the cold case. All three
          were answering one question. */}
      <div className="source-note" style={{ marginTop: -4, marginBottom: 9 }}>
        {selectedCount > 1
          ? `edits apply to all ${selectedCount}, as one undo step. Source shown for ${primary.description ? primary.description.toUpperCase() : 'UNTITLED'} only`
          : primary.status === 'analysing' ? 'reading now'
          : primary.keptKeys?.length
            ? `read from your image, except ${primary.keptKeys.join(' and ').toUpperCase()}, which you set by hand while it was reading`
          : primary.source === 'LIVE' ? 'read from your image just now'
          : primary.source === 'FALLBACK' ? 'last valid values kept, the response could not be read'
          : 'nothing read yet, these are stored values. Pick a swatch or upload a photo'}
      </div>

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

      {/* The bars that stood here drew the same three numbers as the sliders
          above, without the ability to move them, and the DETECTED swatch
          repeated the COLOR row. Between the two readouts the one you can
          operate wins. What is left behind the disclosure is the only thing
          that was not a duplicate: the response verbatim, and the wiring, for
          a reader taking the shader somewhere else. */}
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
)
}
