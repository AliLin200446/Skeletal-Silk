import { useMemo } from "react";
import { useStore, selectPrimary } from "../store";

// Whether the selected layers agree on a value. Without this the panel shows
// the first selected layer's number and says nothing about the rest, which
// reads as "all of them are 0.48" when it means "one of them is". Dragging
// still flattens them to a single value, because that is what a batch edit is;
// the point is that the readout should not claim they were already equal.
function useSelectedLayers() {
  const layers = useStore((s) => s.layers);
  const selectedIds = useStore((s) => s.selectedIds);
  return useMemo(
    () => layers.filter((l) => selectedIds.includes(l.id)),
    [layers, selectedIds],
  );
}

const MIXED = "Mixed";

const readParam = (selected, key) => {
  if (!selected.length) return { value: 0, mixed: false };
  const first = selected[0].params[key];
  return { value: first, mixed: selected.some((l) => l.params[key] !== first) };
};

const hex = (color) =>
  "#" +
  color
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

function Slider({ label, paramKey, selected }) {
  const setSelectedParam = useStore((s) => s.setSelectedParam);
  const { value, mixed } = readParam(selected, paramKey);
  const count = selected.length;
  return (
    <div className="slider-row">
      <div className="slider-label">
        <span>
          {label}
          {count > 1 ? ` · ${count}` : ""}
        </span>
        <span className={`slider-val${mixed ? " is-mixed" : ""}`}>
          {mixed ? MIXED : String(Math.round(value * 100))}
        </span>
      </div>
      {/* The thumb sits at the first selected layer's value even when mixed.
        There is no honest position for a disagreement, and parking it at
        zero would misreport more than it explains. */}
      <input
        aria-label={label}
        aria-valuetext={
          mixed ? "Mixed values" : `${Math.round(value * 100)} out of 100`
        }
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => setSelectedParam(paramKey, parseFloat(e.target.value))}
        className="slider"
      />
    </div>
  );
}

export default function LayerInspector({ historyActions }) {
  const primary = useStore(selectPrimary);
  const selected = useSelectedLayers();
  if (!primary) return null;

  const p = primary.params;
  const colorHex = hex(p.color);
  const colorMixed = selected.some((l) => hex(l.params.color) !== colorHex);

  return (
    <section className="panel-section material-controls">
      <div className="control-heading">
        <h2>Material</h2>
        {historyActions}
      </div>
      {selected.length > 1 && (
        <p className="source-note">
          Editing {selected.length} materials; showing the selected one.
        </p>
      )}
      <Slider label="Structure" paramKey="rigidity" selected={selected} />
      <Slider label="Flow" paramKey="flow" selected={selected} />
      <Slider label="Sheen" paramKey="specular" selected={selected} />
      <div className="color-row">
        <span>Color</span>
        <div className="color-swatch" style={{ background: colorHex }} />
        <span className="color-hex">
          {colorMixed ? MIXED : colorHex.toUpperCase()}
        </span>
      </div>
    </section>
  );
}
