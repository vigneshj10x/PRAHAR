/**
 * frontend/src/features/location/LocationPickerMap.tsx
 *
 * High-precision interactive Leaflet map component with dark engineering theme,
 * click-to-pin coordinate resolution, draggable marker, and pan controls.
 */

import { useEffect, useRef, type FC } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface LocationPickerMapProps {
  lat: number
  lon: number
  name?: string
  onLocationChange: (lat: number, lon: number) => void
  height?: number | string
}

export const LocationPickerMap: FC<LocationPickerMapProps> = ({
  lat,
  lon,
  name,
  onLocationChange,
  height = 180,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  // Custom SVG engineering pin icon
  const customIcon = L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        position: relative;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translate(-50%, -50%);
      ">
        <div style="
          position: absolute;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(217, 119, 6, 0.25);
          animation: mapPinPulse 2s infinite ease-out;
        "></div>
        <div style="
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #d97706;
          border: 2px solid #ffffff;
          box-shadow: 0 0 8px rgba(217, 119, 6, 0.7);
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    const initialLat = Number.isFinite(lat) ? lat : 34.1526
    const initialLon = Number.isFinite(lon) ? lon : 77.5771

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 6,
      minZoom: 2,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: false,
    })

    // CartoDB Positron tiles (light engineering aesthetic)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)

    // Add minimal zoom control to top-right
    L.control.zoom({ position: 'topright' }).addTo(map)

    // Add marker
    const marker = L.marker([initialLat, initialLon], {
      icon: customIcon,
      draggable: true,
    }).addTo(map)

    marker.on('dragend', (e: any) => {
      const position = e.target.getLatLng()
      onLocationChange(Number(position.lat.toFixed(4)), Number(position.lng.toFixed(4)))
    })

    // Click anywhere on map to reposition marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng
      const roundedLat = Number(clickLat.toFixed(4))
      const roundedLng = Number(clickLng.toFixed(4))
      marker.setLatLng([roundedLat, roundedLng])
      onLocationChange(roundedLat, roundedLng)
    })

    mapInstanceRef.current = map
    markerRef.current = marker

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })
    resizeObserver.observe(mapContainerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
    }
  }, [])

  // Sync map center & marker position on lat/lon prop changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return

    const curPos = markerRef.current.getLatLng()
    if (Math.abs(curPos.lat - lat) > 0.0001 || Math.abs(curPos.lng - lon) > 0.0001) {
      markerRef.current.setLatLng([lat, lon])
      mapInstanceRef.current.panTo([lat, lon], { animate: true, duration: 0.5 })
    }
  }, [lat, lon])

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: 3,
        overflow: 'hidden',
        border: '1px solid var(--border-base)',
        background: '#111318',
      }}
    >
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* Crosshair Overlay HUD */}
      <div
        style={{
          position: 'absolute',
          bottom: 6,
          left: 6,
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(4px)',
          border: '1px solid var(--border-base)',
          borderRadius: 3,
          padding: '2px 7px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          pointerEvents: 'none',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--solar)' }} />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            color: 'var(--text-primary)',
            fontWeight: 700,
          }}
        >
          {lat.toFixed(3)}°N, {lon.toFixed(3)}°E
        </span>
        {name && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              color: 'var(--text-muted)',
              maxWidth: 130,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            • {name}
          </span>
        )}
      </div>

      <style>{`
        @keyframes mapPinPulse {
          0% { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.0); opacity: 0; }
        }
        .leaflet-container {
          background: #f8fafc !important;
          font-family: var(--font-mono) !important;
        }
        .leaflet-control-zoom a {
          background: #ffffff !important;
          color: #334155 !important;
          border-color: #cbd5e1 !important;
          width: 22px !important;
          height: 22px !important;
          line-height: 22px !important;
          font-size: 12px !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #f1f5f9 !important;
          color: #d97706 !important;
        }
      `}</style>
    </div>
  )
}

export default LocationPickerMap
