import { useStore, selectPrimary } from '../store'

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

function Slider({ label, paramKey }) {
  const primary = useStore(selectPrimary)
  const selectedCount = useStore((s) => s.selectedIds.length)
  const setSelectedParam = useStore((s) => s.setSelectedParam)
  const val = primary?.params?.[paramKey] ?? 0
  return (
    <div className="slider-row">
      <div className="slider-label">
        <span>{label}{selectedCount > 1 ? ` · ${selectedCount}` : ''}</span>
        <span className="slider-val">{val.toFixed(2)}</span>
      </div>
      <input type="range" min="0" max="1" step="0.01" value={val}
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
  const selectedCount = useStore((s) => s.selectedIds.length)
  if (!primary) return null

  const p = primary.params
  const colorHex = '#' + p.color.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')

  return (
    <>
      <section className="panel-section">
        <div className="section-label">
          UNIFORMS
          {selectedCount > 1 && <span className="layer-count">{selectedCount} SELECTED</span>}
        </div>
        <Slider label="RIGIDITY" paramKey="rigidity" />
        <Slider label="FLOW"     paramKey="flow" />
        <Slider label="SPECULAR" paramKey="specular" />
        <div className="color-row">
          <span className="slider-label-text">COLOR</span>
          <div className="color-swatch" style={{ background: colorHex }} />
          <span className="color-hex">{colorHex.toUpperCase()}</span>
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
        {primary.source === 'CACHED' && (
          <div className="source-note">stored values — upload a photo to run Claude on it</div>
        )}
        {primary.source === 'LIVE' && (
          <div className="source-note">read from your image just now</div>
        )}

        <ParamBar label="RIGIDITY" value={p.rigidity} />
        <ParamBar label="FLOW"     value={p.flow} />
        <ParamBar label="SPECULAR" value={p.specular} />
        <div className="color-row" style={{ marginTop: 10 }}>
          <span className="slider-label-text">DETECTED</span>
          <div className="color-swatch" style={{ background: colorHex }} />
          <span className="color-hex">{colorHex.toUpperCase()}</span>
        </div>

        <pre className="raw-json">{primary.rawJson}</pre>
        <div className="uniform-map-label">the model&rsquo;s reading, wired straight to the shader&rsquo;s uniforms</div>
        <div className="uniform-map">
          rigidity → uRigidity · flow → uFlow · specular → uSpecular · color → uColor
        </div>
      </section>
    </>
  )
}
