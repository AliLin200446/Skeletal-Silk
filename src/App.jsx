import Scene from './components/Scene'
import Panel from './components/Panel'
import LeftPanel from './components/LeftPanel'
import './App.css'

function MobileGate() {
  return (
    <div className="mobile-gate">
      <div>
        <div className="mobile-gate-title">SKELETAL SILK</div>
        <div className="mobile-gate-sub">BIOMATERIAL ENGINE · V1</div>
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
      <LeftPanel />
      <div className="panel-pane"><Panel /></div>
      <MobileGate />
    </div>
  )
}
