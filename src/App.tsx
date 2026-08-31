import type { FC } from 'react'
import TopBar from './components/TopBar'
import LeftPanel from './components/LeftPanel'
import CenterPanel from './components/CenterPanel'
import RightPanel from './components/RightPanel'
import BottomBar from './components/BottomBar'

/**
 * App – root shell.
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │             TopBar (40px)           │
 *   ├──────────┬─────────────┬────────────┤
 *   │ LeftPanel│ CenterPanel │ RightPanel │
 *   │  (260px) │   (flex-1)  │   (260px)  │
 *   ├──────────┴─────────────┴────────────┤
 *   │            BottomBar (28px)         │
 *   └─────────────────────────────────────┘
 */
const App: FC = () => {
  return (
    <div className="app-shell" id="app-root">
      <TopBar />

      <div className="main-area" id="main-area">
        <LeftPanel />
        <CenterPanel />
        <RightPanel />
      </div>

      <BottomBar />
    </div>
  )
}

export default App
