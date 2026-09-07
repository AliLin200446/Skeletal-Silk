import { useRef } from "react";
import { useInstrument } from "../store/instrument";

export function LightManipulator() {
  const { light, setLight } = useInstrument();
  const start = useRef(null);
  const update = (e) => {
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    setLight([
      Math.max(
        -1.5,
        Math.min(1.5, ((e.clientX - rect.left) / rect.width) * 3 - 1.5),
      ),
      Math.max(
        -1.5,
        Math.min(1.5, 1.5 - ((e.clientY - rect.top) / rect.height) * 3),
      ),
      0.3,
    ]);
  };
  return (
    <button
      className="light-handle"
      aria-label="Move light"
      title="Drag to move light"
      style={{
        left: `${((light[0] + 1.5) / 3) * 100}%`,
        top: `${((1.5 - light[1]) / 3) * 100}%`,
      }}
      onPointerDown={(e) => {
        start.current = [...light];
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (start.current) update(e);
      }}
      onPointerUp={(e) => {
        start.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        if (start.current) setLight(start.current);
        start.current = null;
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && start.current) {
          setLight(start.current);
          start.current = null;
        }
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
        )
          return;
        e.preventDefault();
        setLight([
          Math.max(
            -1.5,
            Math.min(
              1.5,
              light[0] +
                (e.key === "ArrowRight"
                  ? 0.05
                  : e.key === "ArrowLeft"
                    ? -0.05
                    : 0),
            ),
          ),
          Math.max(
            -1.5,
            Math.min(
              1.5,
              light[1] +
                (e.key === "ArrowUp"
                  ? 0.05
                  : e.key === "ArrowDown"
                    ? -0.05
                    : 0),
            ),
          ),
          0.3,
        ]);
      }}
    >
      <span className="light-ring" />
    </button>
  );
}

export function LightControls() {
  const { intensity, setIntensity, setLight } = useInstrument();
  return (
    <section className="panel-section">
      <h2>Light</h2>
      <label className="slider-row">
        <span className="slider-label">
          <span>Intensity</span>
          <output className="slider-val">{intensity.toFixed(2)}</output>
        </span>
        <input
          aria-label="Light intensity"
          className="slider"
          type="range"
          min="0"
          max="3"
          step="0.01"
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
        />
      </label>
      <div className="source-note">
        Drag the small circle to move the light.
      </div>
      <button
        className="link-btn"
        onClick={() => {
          setLight([-0.95, 0.55, 0.3]);
          setIntensity(1);
        }}
      >
        Reset light
      </button>
    </section>
  );
}

export function TechnicalReadout() {
  const fps = useInstrument((s) => s.fps);
  return (
    <footer className="technical-readout">
      <span>WebGL / GLSL</span>
      <em>A material is not a texture. It is a response to light.</em>
      <span>{fps ?? "—"} FPS</span>
    </footer>
  );
}
