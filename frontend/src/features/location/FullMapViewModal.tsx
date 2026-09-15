/**
 * frontend/src/features/location/FullMapViewModal.tsx
 *
 * Polar & High-Altitude Location Picker Modal.
 *
 * Features:
 * - Centered card modal with backdrop blur matching the reference design.
 * - Header: Orange compass/navigation icon + "POLAR & HIGH-ALTITUDE LOCATION PICKER" title and subtitle.
 * - Map Banner: "🗺️ Click inside any blue-highlighted cold zone (Ladakh, Kashmir, HP, Uttarakhand, Sikkim, Arunachal)".
 * - Bounding zones with dashed borders & translucent fill for high-altitude cold zones:
 *   - Ladakh
 *   - Kashmir
 *   - Himachal Pradesh & Uttarakhand (Dehradun)
 *   - Sikkim
 *   - Arunachal Pradesh
 * - Click-to-pin & draggable marker with live coordinate resolution.
 * - Footer: Live coordinates "📍 lat°N, lon°E" + "✓ APPLY LOCATION & CLOSE" orange button.
 */

import React, { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  X,
  Navigation,
  Check,
  MapPin,
} from 'lucide-react'
import { useClimateStore, type LocationItem } from '@/store/climateStore'
import { useUIModalStore } from '@/store/uiModalStore'

interface ColdZone {
  id: string
  name: string
  label: string
  bounds: L.LatLngBoundsExpression
  color: string
  fillColor: string
}

const COLD_ZONES: ColdZone[] = [
  {
    id: 'ladakh',
    name: 'Ladakh',
    label: 'Ladakh',
    bounds: [
      [32.2, 75.8],
      [36.0, 79.8],
    ],
    color: '#0284c7',
    fillColor: 'rgba(2, 132, 199, 0.14)',
  },
  {
    id: 'kashmir',
    name: 'Kashmir',
    label: 'Kashmir',
    bounds: [
      [33.1, 73.8],
      [35.4, 75.8],
    ],
    color: '#06b6d4',
    fillColor: 'rgba(6, 182, 212, 0.14)',
  },
  {
    id: 'hp_uk',
    name: 'Himachal & Uttarakhand',
    label: 'Dehradun / HP',
    bounds: [
      [29.8, 76.8],
      [33.1, 81.0],
    ],
    color: '#6366f1',
    fillColor: 'rgba(99, 102, 241, 0.14)',
  },
  {
    id: 'sikkim',
    name: 'Sikkim',
    label: 'Sikkim',
    bounds: [
      [27.0, 88.0],
      [28.2, 89.0],
    ],
    color: '#8b5cf6',
    fillColor: 'rgba(139, 92, 246, 0.14)',
  },
  {
    id: 'arunachal',
    name: 'Arunachal Pradesh',
    label: 'Arunachal Pradesh',
    bounds: [
      [26.8, 91.5],
      [29.5, 97.4],
    ],
    color: '#10b981',
    fillColor: 'rgba(16, 185, 129, 0.14)',
  },
]

export const FullMapViewModal: React.FC = () => {
  const activeModal = useUIModalStore((s) => s.activeModal)
  const closeFullMap = useUIModalStore((s) => s.closeFullMap)

  const {
    selectedLocation,
    setSelectedLocation,
    fetchClimateForLocation,
  } = useClimateStore()

  const [currentLat, setCurrentLat] = useState<number>(selectedLocation.lat)
  const [currentLon, setCurrentLon] = useState<number>(selectedLocation.lon)
  const [currentName, setCurrentName] = useState<string>(selectedLocation.name)
  const [currentAltitude, setCurrentAltitude] = useState<number>(selectedLocation.altitude || 3500)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const isVisible = activeModal === 'fullmap'

  // Sync state when modal opens
  useEffect(() => {
    if (isVisible) {
      setCurrentLat(selectedLocation.lat)
      setCurrentLon(selectedLocation.lon)
      setCurrentName(selectedLocation.name)
      setCurrentAltitude(selectedLocation.altitude || 3500)
    }
  }, [isVisible, selectedLocation])

  // Custom Pin Icon matching reference screenshot
  const createPinIcon = () =>
    L.divIcon({
      className: 'polar-map-pin',
      html: `
        <div style="position: relative; width: 30px; height: 30px; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%);">
          <div style="
            background: #0284c7;
            color: #ffffff;
            font-size: 9px;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 3px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            white-space: nowrap;
            margin-bottom: 2px;
          ">
            Mark
          </div>
          <div style="
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #10b981;
            border: 2px solid #ffffff;
            box-shadow: 0 0 6px rgba(0,0,0,0.4);
          "></div>
        </div>
      `,
      iconSize: [40, 32],
      iconAnchor: [20, 32],
    })

  // Initialize & Manage Map
  useEffect(() => {
    if (!isVisible || !mapContainerRef.current) return

    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize()
        mapInstanceRef.current?.setView([currentLat, currentLon], 6, { animate: true })
      }, 100)
      return
    }

    const initialLat = Number.isFinite(currentLat) ? currentLat : 34.1526
    const initialLon = Number.isFinite(currentLon) ? currentLon : 77.5771

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 6,
      minZoom: 3,
      maxZoom: 16,
      zoomControl: true,
      attributionControl: true,
    })

    // OpenStreetMap standard tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    // Render Bounding Cold Zones with labels
    COLD_ZONES.forEach((zone) => {
      const rect = L.rectangle(zone.bounds, {
        color: zone.color,
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: zone.fillColor,
        fillOpacity: 0.18,
      }).addTo(map)

      rect.bindTooltip(zone.label, {
        permanent: true,
        direction: 'center',
        className: 'cold-zone-tooltip',
      })

      rect.on('click', (e: L.LeafletMouseEvent) => {
        const nLat = Number(e.latlng.lat.toFixed(4))
        const nLon = Number(e.latlng.lng.toFixed(4))
        setCurrentLat(nLat)
        setCurrentLon(nLon)
        setCurrentName(`${zone.name} (${nLat.toFixed(2)}°, ${nLon.toFixed(2)}°)`)
        if (markerRef.current) {
          markerRef.current.setLatLng([nLat, nLon])
        }
      })
    })

    // Add Primary Location Marker
    const marker = L.marker([initialLat, initialLon], {
      icon: createPinIcon(),
      draggable: true,
    }).addTo(map)

    marker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng()
      const nLat = Number(pos.lat.toFixed(4))
      const nLon = Number(pos.lng.toFixed(4))
      setCurrentLat(nLat)
      setCurrentLon(nLon)
      setCurrentName(`${nLat.toFixed(2)}°, ${nLon.toFixed(2)}°`)
    })

    markerRef.current = marker

    // Click anywhere on map to reposition pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const nLat = Number(e.latlng.lat.toFixed(4))
      const nLon = Number(e.latlng.lng.toFixed(4))
      setCurrentLat(nLat)
      setCurrentLon(nLon)
      setCurrentName(`${nLat.toFixed(2)}°, ${nLon.toFixed(2)}°`)
      if (markerRef.current) {
        markerRef.current.setLatLng([nLat, nLon])
      }
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
    }
  }, [isVisible])

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        closeFullMap()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, closeFullMap])

  // Apply location and trigger simulation
  const handleApplyLocation = () => {
    const updated: LocationItem = {
      id: `custom_${currentLat.toFixed(2)}_${currentLon.toFixed(2)}`,
      name: currentName || `${currentLat.toFixed(2)}°N, ${currentLon.toFixed(2)}°E`,
      region: 'Designated Cold Zone',
      country: 'IN',
      lat: currentLat,
      lon: currentLon,
      altitude: currentAltitude,
    }

    setSelectedLocation(updated)
    fetchClimateForLocation(currentLat, currentLon, currentName, currentAltitude)
    closeFullMap()
  }

  if (!isVisible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeFullMap()
      }}
    >
      {/* ── Centered Card Modal Dialog ── */}
      <div
        style={{
          width: 820,
          maxWidth: '94vw',
          height: 560,
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: 8,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ color: '#d97706', marginTop: 2 }}>
              <Navigation size={18} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '0.04em',
                  margin: 0,
                  textTransform: 'uppercase',
                  fontFamily: 'inherit',
                }}
              >
                POLAR & HIGH-ALTITUDE LOCATION PICKER
              </h2>
              <p
                style={{
                  fontSize: 10,
                  color: '#64748b',
                  margin: '2px 0 0 0',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Click any site inside designated Indian cold zones to fetch NASA POWER climatology
              </p>
            </div>
          </div>

          <button
            onClick={closeFullMap}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Map Body ── */}
        <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 0 }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', background: '#f8fafc' }} />

          {/* Floating Top Banner Pill */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(15, 23, 42, 0.88)',
              backdropFilter: 'blur(6px)',
              color: '#f8fafc',
              padding: '5px 12px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              fontFamily: 'var(--font-mono)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              zIndex: 1000,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🗺️</span>
            <span>Click inside any blue-highlighted cold zone (Ladakh, Kashmir, HP, Uttarakhand, Sikkim, Arunachal)</span>
          </div>
        </div>

        {/* ── Modal Footer ── */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          {/* Coordinates Readout */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: '#1e293b',
            }}
          >
            <MapPin size={13} color="#d97706" />
            <span>
              {currentLat.toFixed(2)}°N, {currentLon.toFixed(2)}°E
            </span>
          </div>

          {/* Action Button */}
          <button
            id="apply-location-btn"
            onClick={handleApplyLocation}
            style={{
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: 4,
              padding: '7px 16px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 6px rgba(217, 119, 6, 0.35)',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#b45309')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#d97706')}
          >
            <Check size={14} strokeWidth={2.5} />
            <span>APPLY LOCATION & CLOSE</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default FullMapViewModal
