import Scene from './components/Scene'
import Panel from './components/Panel'
import LeftPanel from './components/LeftPanel'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <div className="canvas-pane"><Scene /></div>
      <LeftPanel />
      <div className="panel-pane"><Panel /></div>
    </div>
  )
}
