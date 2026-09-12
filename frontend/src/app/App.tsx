import type { FC } from 'react'
import TopBar from './TopBar'
import BottomBar from './BottomBar'
import LeftPanel from '@/features/design-parameters/LeftPanel'
import CenterPanel from '@/features/digital-twin/CenterPanel'
import RightPanel from '@/features/thermal-performance/RightPanel'
import FullMapPage from '@/features/location/FullMapPage'
import LayerAnalyticsPage from '@/features/layers/LayerAnalyticsPage'
import { useNavigationStore } from '@/store/navigationStore'

/**
 * App – root shell layout.
 *
 * Supports three dedicated first-class pages:
 * 1. 'workbench': 3D Digital Twin Simulation Workbench (LeftPanel + CenterPanel + RightPanel)
 * 2. 'map': Dedicated Full Map View for High-Precision Exact Coordinate Selection & GIS Telemetry
 * 3. 'layer-analytics': Dedicated Full-Page Layer-by-Layer EnergyPlus & Physics Workstation
 */
export const App: FC = () => {
  const activePage = useNavigationStore((s) => s.activePage)

  return (
    <div className="app-shell" id="app-root">
      <TopBar />

      {activePage === 'map' ? (
        <FullMapPage />
      ) : activePage === 'layer-analytics' ? (
        <LayerAnalyticsPage />
      ) : (
        <div className="main-area" id="main-area">
          <LeftPanel />
          <CenterPanel />
          <RightPanel />
        </div>
      )}

      <BottomBar />
    </div>
  )
}

export default App
