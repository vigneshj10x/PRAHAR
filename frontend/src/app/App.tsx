import type { FC } from 'react'
import TopBar from './TopBar'
import BottomBar from './BottomBar'
import LeftPanel from '@/features/design-parameters/LeftPanel'
import CenterPanel from '@/features/digital-twin/CenterPanel'
import RightPanel from '@/features/thermal-performance/RightPanel'

/**
 * App – root shell layout.
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
export const App: FC = () => {
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
