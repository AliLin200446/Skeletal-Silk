import { useState } from "react";
import { useStore, selectImageSrc, MAX_LAYERS } from "../store";
import { cancelLayer, cancelRequest } from "../utils/requests";

const STATUS_GLYPH = {
  idle: "",
  analysing: "◌",
  cancelled: "⊘",
  error: "✕",
};

function toHex(color) {
  return (
    "#" +
    color
      .map((c) =>
        Math.round(c * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export default function LayerList() {
  const layers = useStore((s) => s.layers);
  const selectedIds = useStore((s) => s.selectedIds);
  const images = useStore((s) => s.images);
  const selectOnly = useStore((s) => s.selectOnly);
  const toggleSelect = useStore((s) => s.toggleSelect);
  const selectThrough = useStore((s) => s.selectThrough);
  const removeLayer = useStore((s) => s.removeLayer);
  const patchLayer = useStore((s) => s.patchLayer);
  const recordCancelled = useStore((s) => s.recordCancelled);
  const addLayer = useStore((s) => s.addLayer);
  const reorderLayers = useStore((s) => s.reorderLayers);

  // Drag state is local: it exists only between dragstart and drop, and a
  // half-finished drag is not something undo should be able to land on.
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  const pick = (e, id) => {
    if (e.shiftKey) selectThrough(id);
    else if (e.metaKey || e.ctrlKey) toggleSelect(id);
    else selectOnly(id);
  };

  return (
    <div className="saved-materials">
      <div className="layer-list">
        {layers.map((layer, i) => {
          const src = selectImageSrc({ images }, layer);
          const on = selectedIds.includes(layer.id);
          return (
            <div
              key={layer.id}
              className={`layer-row${on ? " is-selected" : ""}${dragIndex === i ? " is-dragging" : ""}${overIndex === i && dragIndex !== null && dragIndex !== i ? " is-drop-target" : ""}`}
              draggable
              onDragStart={(e) => {
                setDragIndex(i);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverIndex(i);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const raw = e.dataTransfer.getData("text/plain");
                const from =
                  dragIndex !== null
                    ? dragIndex
                    : raw === ""
                      ? null
                      : Number(raw);
                setDragIndex(null);
                setOverIndex(null);
                if (from !== null && Number.isInteger(from) && from !== i)
                  reorderLayers(from, i);
              }}
            >
              <button
                className="layer-select"
                aria-pressed={on}
                onClick={(e) => pick(e, layer.id)}
              >
                {src ? (
                  <img className="layer-thumb" src={src} alt="" />
                ) : (
                  <span
                    className="layer-thumb"
                    style={{ background: toHex(layer.params.color) }}
                  />
                )}
                <span className="layer-name">
                  {layer.imageName || layer.description || "Untitled material"}
                </span>
              </button>
              {layer.status === "analysing" ? (
                <button
                  className="link-btn"
                  aria-label="Cancel material analysis"
                  onClick={() => {
                    const rid = layer.requestId;
                    patchLayer(layer.id, {
                      status: "cancelled",
                      requestId: null,
                      error: null,
                    });
                    if (cancelRequest(rid)) recordCancelled();
                  }}
                >
                  Cancel
                </button>
              ) : (
                <span
                  title={layer.status === "idle" ? undefined : layer.status}
                >
                  {STATUS_GLYPH[layer.status]}
                </span>
              )}
              {layers.length > 1 && (
                <button
                  className="layer-remove"
                  aria-label={`Remove ${layer.imageName || layer.description || "material"}`}
                  onClick={() => {
                    if (cancelLayer(layer.id)) recordCancelled();
                    removeLayer(layer.id);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
      <button
        className="link-btn"
        disabled={layers.length >= MAX_LAYERS}
        onClick={() => addLayer()}
      >
        {layers.length >= MAX_LAYERS
          ? `Maximum ${MAX_LAYERS} materials`
          : "+ Add material"}
      </button>
      {layers.length > 1 && (
        <p className="source-note">
          Choose a material to view it. Shift / ⌘ selects several for shared
          edits.
        </p>
      )}
    </div>
  );
}
