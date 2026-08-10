import Scene from './components/Scene'
import LabPanel from './components/LabPanel'
import { LAB } from './utils/lab'
import Panel from './components/Panel'
import LeftPanel from './components/LeftPanel'
import ExportShader from './components/ExportShader'
import './App.css'

function MobileGate() {
  return (
    <div className="mobile-gate">
      <div>
        <div className="mobile-gate-title">SKELETAL SILK</div>
        <div className="mobile-gate-sub">MATERIAL PHOTO → SHADER PARAMETERS</div>
        <div className="mobile-gate-rule" />
        <div className="mobile-gate-body">
          A REALTIME WEBGL PIECE —<br />
          BEST EXPERIENCED ON DESKTOP
        </div>
        <div className="mobile-gate-credit">ALI LIN · ALILINLAB.COM</div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      <div className="canvas-pane"><Scene /></div>
      <ExportShader />
      <LeftPanel />
      <div className="panel-pane"><Panel /></div>
      <MobileGate />
      {/* Off unless the page was opened with ?lab=1. With the flag absent this
          renders nothing at all, so the shipped tree is byte-identical. */}
      {LAB && <LabPanel />}
    </div>
  )
}
