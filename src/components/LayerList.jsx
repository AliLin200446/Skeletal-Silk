import { useStore, selectImageSrc, MAX_LAYERS } from '../store'
import { cancelLayer, cancelRequest } from '../utils/requests'

const STATUS_GLYPH = {
  idle: '',
  analysing: '◌',
  cancelled: '⊘',
  error: '✕',
}

function toHex(color) {
  return '#' + color.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')
}

export default function LayerList() {
  const layers = useStore((s) => s.layers)
  const selectedIds = useStore((s) => s.selectedIds)
  const images = useStore((s) => s.images)
  const selectOnly = useStore((s) => s.selectOnly)
  const toggleSelect = useStore((s) => s.toggleSelect)
  const selectThrough = useStore((s) => s.selectThrough)
  const removeLayer = useStore((s) => s.removeLayer)
  const patchLayer = useStore((s) => s.patchLayer)
  const addLayer = useStore((s) => s.addLayer)

  const pick = (e, id) => {
    if (e.shiftKey) selectThrough(id)
    else if (e.metaKey || e.ctrlKey) toggleSelect(id)
    else selectOnly(id)
  }

  return (
    <section className="panel-section">
      <div className="section-label">
        LAYERS
        <span className="layer-count">{layers.length} / {MAX_LAYERS}</span>
      </div>

      <div className="layer-list">
        {layers.map((layer, i) => {
          const src = selectImageSrc({ images }, layer)
          const on = selectedIds.includes(layer.id)
          return (
            <div
              key={layer.id}
              className={`layer-row${on ? ' is-selected' : ''}`}
              onClick={(e) => pick(e, layer.id)}
            >
              <span className="layer-index">{String(i + 1).padStart(2, '0')}</span>
              {src
                ? <img className="layer-thumb" src={src} alt="" />
                : <span className="layer-thumb layer-thumb-empty"
                        style={{ background: toHex(layer.params.color) }} />}
              <span className="layer-meta">
                <span className="layer-name">
                  {layer.description ? layer.description.slice(0, 18).toUpperCase() : 'UNTITLED'}
                </span>
                <span className="layer-nums">
                  {layer.params.rigidity.toFixed(2)} {layer.params.flow.toFixed(2)} {layer.params.specular.toFixed(2)}
                </span>
              </span>
              {layer.status === 'analysing' ? (
                <button
                  className="layer-status layer-status-analysing"
                  title="cancel this analysis"
                  onClick={(e) => {
                    e.stopPropagation()
                    const rid = layer.requestId
                    patchLayer(layer.id, { status: 'cancelled', requestId: null, error: null })
                    cancelRequest(rid)
                  }}
                >{STATUS_GLYPH.analysing}</button>
              ) : (
                <span className={`layer-status layer-status-${layer.status}`}>
                  {STATUS_GLYPH[layer.status]}
                </span>
              )}
              {layers.length > 1 && (
                <button
                  className="layer-remove"
                  title="remove layer"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Abort before the layer disappears, otherwise the response
                    // arrives with nothing to land on and the request runs to
                    // completion at full cost for a sample that is gone.
                    cancelLayer(layer.id)
                    removeLayer(layer.id)
                  }}
                >{'×'}</button>
              )}
            </div>
          )
        })}
      </div>

      <button
        className="btn full-width layer-add"
        disabled={layers.length >= MAX_LAYERS}
        onClick={() => addLayer()}
      >
        {layers.length >= MAX_LAYERS ? `MAX ${MAX_LAYERS} LAYERS` : '+ ADD LAYER'}
      </button>
    </section>
  )
}
