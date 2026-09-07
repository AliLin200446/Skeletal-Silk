import { useRef, useState } from "react";
import Scene from "./components/Scene";
import LabPanel from "./components/LabPanel";
import { LAB } from "./utils/lab";
import Panel from "./components/Panel";
import { LightManipulator, TechnicalReadout } from "./components/Instrument";
import vertGLSL from "./shaders/skeletal.vert.glsl?raw";
import fragGLSL from "./shaders/skeletal.frag.glsl?raw";
import "./App.css";

export default function App() {
  const [controlsOpen, setControlsOpen] = useState(true);
  const about = useRef(null);
  const source = useRef(null);
  return (
    <div className={`app ${controlsOpen ? "controls-open" : ""}`}>
      <header className="topbar">
        <div className="identity">Skeletal Silk</div>
        <nav>
          <button onClick={() => about.current.showModal()}>About</button>
          <a href="https://alilinlab.com" target="_blank" rel="noreferrer">
            Alilinlab ↗
          </a>
        </nav>
      </header>
      <main className="canvas-pane" aria-label="Material preview">
        <Scene />
        <div className="light-plane">
          <LightManipulator />
        </div>
        <p className="viewport-hint">
          Drag to explore <span>·</span> Scroll to zoom
        </p>
      </main>
      <aside className="panel-pane" aria-label="Material controls">
        <button
          className="mobile-controls-toggle"
          aria-expanded={controlsOpen}
          onClick={() => setControlsOpen(!controlsOpen)}
        >
          Materials & controls <span>{controlsOpen ? "−" : "+"}</span>
        </button>
        <div className="controls-content">
          <Panel onShowSource={() => source.current.showModal()} />
        </div>
      </aside>
      <TechnicalReadout />
      <dialog
        ref={about}
        className="about-dialog"
        aria-label="About Skeletal Silk"
      >
        <div className="reference-head">
          Skeletal Silk
          <button className="link-btn" onClick={() => about.current.close()}>
            Close ×
          </button>
        </div>
        <p>A study in how materials move and respond to light.</p>
        <p>
          Upload a photograph to turn its character into a material you can
          explore. Drag the surface, move the light, and make it your own.
        </p>
        <p>
          The image analysis estimates rigidity, flow, specular response, and
          color. These guide a fixed shader; they are not physical measurements.
        </p>
        <a
          className="link-btn"
          href="https://alilinlab.com/work/skeletal-silk"
          target="_blank"
          rel="noreferrer"
        >
          More about the project ↗
        </a>
      </dialog>
      <dialog
        ref={source}
        className="reference-dialog"
        aria-label="Shader source"
      >
        <div className="reference-head">
          Shader source
          <button className="link-btn" onClick={() => source.current.close()}>
            Close ×
          </button>
        </div>
        <p>Vertex</p>
        <pre className="raw-json">{vertGLSL}</pre>
        <p>Fragment</p>
        <pre className="raw-json">{fragGLSL}</pre>
      </dialog>
      {LAB && <LabPanel />}
    </div>
  );
}
