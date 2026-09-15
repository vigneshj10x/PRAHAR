/**
 * frontend/src/features/location/FullMapPage.tsx
 *
 * Dedicated Full-Page Geospatial Climate Map & High-Precision Coordinate Workstation.
 *
 * Features:
 * - Full-screen interactive Leaflet map canvas with dark/topographic/satellite tiles.
 * - Exact-point marking: Click anywhere or drag the custom HUD pin to point to exact geographical coordinates.
 * - Direct manual coordinate entry (Decimal Lat/Lon) with instant "Jump & Pin".
 * - Real-time geocoding search & reverse geocoding with altitude calculation.
 * - Highlighted extreme high-altitude cold zones (Ladakh, Siachen, Spiti, Kashmir, HP, Uttarakhand, Sikkim, Arunachal) and Thar Desert.
 * - Live bioclimatic preview HUD (Temperature range, Solar potential, Wind speed, DIHAR solar window).
 * - Direct "✓ APPLY & SIMULATE IN 3D TWIN" button to sync coordinates and switch seamlessly to 3D Digital Twin.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  MapPin,
  Compass,
  Search,
  Check,
  Thermometer,
  Sun,
  Wind,
  Droplets,
  Crosshair,
  LocateFixed,
} from 'lucide-react'
import { useClimateStore, type LocationItem } from '@/store/climateStore'
import { useNavigationStore } from '@/store/navigationStore'

// ─── Cold Climate & Extreme Zone Definitions ──────────────────────────────────
interface BioclimaticZone {
  id: string
  name: string
  zone: string
  label: string
  bounds: L.LatLngBoundsExpression
  center: [number, number]
  color: string
  fillColor: string
  description: string
  avgAltitude: string
}

const BIOCLIMATIC_ZONES: BioclimaticZone[] = [
  {
    id: 'ladakh',
    name: 'Ladakh High-Altitude Desert',
    zone: 'Cold & Arid',
    label: 'Ladakh Zone (3,500m+)',
    bounds: [
      [32.2, 75.8],
      [36.0, 79.8],
    ],
    center: [34.1526, 77.5771],
    color: '#0284c7',
    fillColor: 'rgba(2, 132, 199, 0.14)',
    description: 'Sub-zero extreme winter, high solar diurnal window (520+ W/m²)',
    avgAltitude: '3,524 m',
  },
  {
    id: 'siachen',
    name: 'Siachen & Karakoram Glacier Range',
    zone: 'Polar & Alpine',
    label: 'Siachen / Karakoram (5,400m+)',
    bounds: [
      [35.0, 76.5],
      [35.8, 77.5],
    ],
    center: [35.4212, 77.1085],
    color: '#38bdf8',
    fillColor: 'rgba(56, 189, 248, 0.18)',
    description: 'Glacial sub-polar terrain, extreme wind chill and nocturnal radiative loss',
    avgAltitude: '5,400 m',
  },
  {
    id: 'kashmir',
    name: 'Kashmir Valley & Pir Panjal',
    zone: 'Cold & Cloudy',
    label: 'Kashmir Valley (1,600m)',
    bounds: [
      [33.1, 73.8],
      [35.4, 75.8],
    ],
    center: [34.0837, 74.7973],
    color: '#06b6d4',
    fillColor: 'rgba(6, 182, 212, 0.14)',
    description: 'Cloudy winter days with heavy snowfall and high moisture retention',
    avgAltitude: '1,585 m',
  },
  {
    id: 'hp_uk',
    name: 'Himachal & Uttarakhand Himalayan Range',
    zone: 'Montane & Alpine',
    label: 'HP / Uttarakhand (2,200m+)',
    bounds: [
      [29.8, 76.8],
      [33.1, 81.0],
    ],
    center: [31.1048, 77.1734],
    color: '#6366f1',
    fillColor: 'rgba(99, 102, 241, 0.14)',
    description: 'Steep montane snow slopes, freeze-thaw cycles, high windward precipitation',
    avgAltitude: '2,276 m',
  },
  {
    id: 'sikkim',
    name: 'Sikkim Eastern Himalayas',
    zone: 'Alpine Montane',
    label: 'Sikkim Alpine (2,800m)',
    bounds: [
      [27.0, 88.0],
      [28.2, 89.0],
    ],
    center: [27.3389, 88.6065],
    color: '#8b5cf6',
    fillColor: 'rgba(139, 92, 246, 0.14)',
    description: 'High precipitation, cloud cover with high insulation requirements',
    avgAltitude: '2,800 m',
  },
  {
    id: 'arunachal',
    name: 'Tawang & Arunachal Highlands',
    zone: 'High Altitude Cold',
    label: 'Tawang / Arunachal (3,000m)',
    bounds: [
      [26.8, 91.5],
      [29.5, 97.4],
    ],
    center: [27.5861, 91.8594],
    color: '#10b981',
    fillColor: 'rgba(16, 185, 129, 0.14)',
    description: 'Sub-zero winters, dense alpine snowstorms, critical passive thermal retention',
    avgAltitude: '3,048 m',
  },
  {
    id: 'thar',
    name: 'Thar Desert / Jaisalmer Arid Basin',
    zone: 'Hot & Dry Desert',
    label: 'Thar Desert (225m)',
    bounds: [
      [25.5, 69.5],
      [28.5, 73.0],
    ],
    center: [26.9157, 70.9083],
    color: '#f59e0b',
    fillColor: 'rgba(245, 158, 11, 0.14)',
    description: 'High diurnal swing (8°C night to 42°C day), extreme direct horizontal insolation',
    avgAltitude: '225 m',
  },
]

// ─── Preset Coordinates Grid ──────────────────────────────────────────────────
const QUICK_PRESETS = [
  { id: 'leh', name: 'Leh, Ladakh', lat: 34.1526, lon: 77.5771, alt: 3524, zone: 'Cold & Arid' },
  { id: 'siachen', name: 'Siachen Base Camp', lat: 35.4212, lon: 77.1085, alt: 3650, zone: 'Polar Extreme' },
  { id: 'dras', name: 'Dras, Kargil', lat: 34.4289, lon: 75.7533, alt: 3280, zone: 'Sub-Zero Cold' },
  { id: 'tawang', name: 'Tawang, Arunachal', lat: 27.5861, lon: 91.8594, alt: 3048, zone: 'Montane Alpine' },
  { id: 'srinagar', name: 'Srinagar, Kashmir', lat: 34.0837, lon: 74.7973, alt: 1585, zone: 'Cold & Cloudy' },
  { id: 'shimla', name: 'Shimla, HP', lat: 31.1048, lon: 77.1734, alt: 2276, zone: 'Himalayan Montane' },
  { id: 'jaisalmer', name: 'Jaisalmer, Rajasthan', lat: 26.9157, lon: 70.9083, alt: 225, zone: 'Hot & Dry Desert' },
  { id: 'new_delhi', name: 'New Delhi, NCR', lat: 28.6139, lon: 77.2090, alt: 216, zone: 'Composite Extreme' },
  { id: 'kochi', name: 'Kochi, Kerala', lat: 9.9312, lon: 76.2673, alt: 2, zone: 'Warm & Humid' },
]

export const FullMapPage: React.FC = () => {
  const selectedLocation = useClimateStore((s) => s.selectedLocation)
  const activeProfile = useClimateStore((s) => s.activeProfile)
  const setSelectedLocation = useClimateStore((s) => s.setSelectedLocation)
  const fetchClimateForLocation = useClimateStore((s) => s.fetchClimateForLocation)
  const searchQuery = useClimateStore((s) => s.searchQuery)
  const setSearchQuery = useClimateStore((s) => s.setSearchQuery)
  const searchResults = useClimateStore((s) => s.searchResults)
  const searchPlaces = useClimateStore((s) => s.searchPlaces)
  const clearSearchResults = useClimateStore((s) => s.clearSearchResults)

  const openWorkbench = useNavigationStore((s) => s.openWorkbench)

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const isInternalUpdate = useRef(false)

  // Local exact coordinate inputs
  const [exactLat, setExactLat] = useState<number>(selectedLocation.lat)
  const [exactLon, setExactLon] = useState<number>(selectedLocation.lon)
  const [exactAlt, setExactAlt] = useState<number>(selectedLocation.altitude || 3500)
  const [placeName, setPlaceName] = useState<string>(selectedLocation.name || 'Leh, Ladakh')
  const [isResolving, setIsResolving] = useState(false)

  // Cursor coordinates tracker
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null)

  // Sync state if selectedLocation changes from outside
  useEffect(() => {
    if (!isInternalUpdate.current) {
      setExactLat(selectedLocation.lat)
      setExactLon(selectedLocation.lon)
      setExactAlt(selectedLocation.altitude || 3500)
      setPlaceName(selectedLocation.name || 'Selected Location')
    }
  }, [selectedLocation])

  // ─── Custom Leaflet Pin Icon ────────────────────────────────────────────────
  const customPinIcon = useMemo(() => {
    return L.divIcon({
      className: 'hud-map-pin',
      html: `
        <div style="position: relative; width: 34px; height: 42px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: rgba(217, 119, 6, 0.28); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; top: 0; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.45));">
            <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 0C7.61116 0 0 7.61116 0 17C0 29.75 17 42 17 42C17 42 34 29.75 34 17C34 7.61116 26.3888 0 17 0Z" fill="#d97706"/>
              <path d="M17 2C8.71573 2 2 8.71573 2 17C2 28.2 17 39.5 17 39.5C17 39.5 32 28.2 32 17C32 8.71573 25.2843 2 17 2Z" stroke="#fef3c7" stroke-width="1.5"/>
              <circle cx="17" cy="16" r="6" fill="#0f172a"/>
              <circle cx="17" cy="16" r="3" fill="#fbbf24"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 42],
      popupAnchor: [0, -42],
    })
  }, [])

  // ─── Initialize Leaflet Map ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return // Already initialized

    const initialLat = selectedLocation.lat || 34.1526
    const initialLon = selectedLocation.lon || 77.5771

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: 7,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: false,
    })

    // Add Zoom Control to top right
    L.control.zoom({ position: 'topright' }).addTo(map)

    // Base Tile Layer
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }
    ).addTo(map)

    // Track mouse move for cursor coordinates
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({
        lat: Number(e.latlng.lat.toFixed(5)),
        lon: Number(e.latlng.lng.toFixed(5)),
      })
    })

    map.on('mouseout', () => {
      setCursorCoords(null)
    })

    // Draw Bioclimatic Zone Polygons
    BIOCLIMATIC_ZONES.forEach((zone) => {
      const polygon = L.rectangle(zone.bounds, {
        color: zone.color,
        weight: 1.5,
        dashArray: '5, 5',
        fillColor: zone.fillColor,
        fillOpacity: 0.18,
      }).addTo(map)

      polygon.bindTooltip(
        `<div style="font-family: monospace; font-size: 11px; font-weight: 700; color: ${zone.color};">
          ${zone.label}<br/>
          <span style="font-size: 9.5px; color: #475569; font-weight: 400;">${zone.description}</span>
        </div>`,
        { sticky: true, className: 'bioclimatic-tooltip' }
      )

      polygon.on('click', (e: L.LeafletMouseEvent) => {
        handleExactPointSelect(e.latlng.lat, e.latlng.lng, `${zone.name}`)
      })
    })

    // Create Draggable Pin Marker
    const marker = L.marker([initialLat, initialLon], {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map)

    marker.bindPopup(`
      <div style="font-family: monospace; font-size: 11px; text-align: center;">
        <strong style="color: #d97706;">📍 EXACT LOCATION POINT</strong><br/>
        Lat: ${initialLat.toFixed(4)}° | Lon: ${initialLon.toFixed(4)}°
      </div>
    `)

    // Marker Drag Handlers
    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      handleExactPointSelect(pos.lat, pos.lng)
    })

    // Map Click Handler -> Point exact coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      handleExactPointSelect(e.latlng.lat, e.latlng.lng)
    })

    mapInstanceRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
    }
  }, [customPinIcon])

  // ─── Handle Exact Point Selection ───────────────────────────────────────────
  const handleExactPointSelect = useCallback(
    async (lat: number, lon: number, customLabel?: string) => {
      isInternalUpdate.current = true
      const fixedLat = Number(lat.toFixed(5))
      const fixedLon = Number(lon.toFixed(5))

      setExactLat(fixedLat)
      setExactLon(fixedLon)

      // Move marker on map
      if (markerRef.current) {
        markerRef.current.setLatLng([fixedLat, fixedLon])
        markerRef.current.setPopupContent(`
          <div style="font-family: monospace; font-size: 11px; text-align: center;">
            <strong style="color: #d97706;">📍 EXACT LOCATION POINT</strong><br/>
            Lat: ${fixedLat}° | Lon: ${fixedLon}°
          </div>
        `)
      }

      setIsResolving(true)

      // Reverse geocode or estimate elevation
      try {
        let name = customLabel || `${fixedLat}°N, ${fixedLon}°E`
        let altitude = 3000

        // Fetch elevation from Open-Meteo elevation API
        const elevResp = await fetch(
          `https://api.open-meteo.com/v1/elevation?latitude=${fixedLat}&longitude=${fixedLon}`,
          { signal: AbortSignal.timeout(4000) }
        )
        if (elevResp.ok) {
          const elevData = await elevResp.json()
          if (elevData.elevation && elevData.elevation[0] !== undefined) {
            altitude = Math.round(elevData.elevation[0])
          }
        }

        // Try reverse geocoding if no custom label
        if (!customLabel) {
          try {
            const geoResp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${fixedLat}&lon=${fixedLon}&format=json`,
              {
                headers: { 'User-Agent': 'ThermoShield-App/1.0' },
                signal: AbortSignal.timeout(4000),
              }
            )
            if (geoResp.ok) {
              const geoData = await geoResp.json()
              if (geoData.display_name) {
                const parts = geoData.display_name.split(',')
                name = `${parts[0].trim()}, ${parts[1]?.trim() || ''}`.replace(/,\s*$/, '')
              }
            }
          } catch {
            // keep default fallback coordinate string
          }
        }

        setExactAlt(altitude)
        setPlaceName(name)

        const locItem: LocationItem = {
          id: `coord_${fixedLat}_${fixedLon}`,
          name: name,
          lat: fixedLat,
          lon: fixedLon,
          altitude: altitude,
        }

        setSelectedLocation(locItem)
        await fetchClimateForLocation(fixedLat, fixedLon, name, altitude)
      } catch (err) {
        console.error('Point resolution error:', err)
      } finally {
        setIsResolving(false)
        isInternalUpdate.current = false
      }
    },
    [fetchClimateForLocation, setSelectedLocation]
  )

  // ─── Jump To Manually Entered Coordinates ────────────────────────────────────
  const handleManualCoordinateJump = () => {
    if (isNaN(exactLat) || isNaN(exactLon)) return
    const clLat = Math.max(-90, Math.min(90, exactLat))
    const clLon = Math.max(-180, Math.min(180, exactLon))

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([clLat, clLon], 8, { duration: 1.2 })
    }
    handleExactPointSelect(clLat, clLon)
  }

  // ─── Select Preset Location ─────────────────────────────────────────────────
  const handlePresetSelect = (preset: typeof QUICK_PRESETS[0]) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([preset.lat, preset.lon], 9, { duration: 1.4 })
    }
    handleExactPointSelect(preset.lat, preset.lon, preset.name)
  }

  // ─── Geolocation / GPS Finder ───────────────────────────────────────────────
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lon], 10, { duration: 1.5 })
        }
        handleExactPointSelect(lat, lon, 'GPS Detected Location')
      },
      () => {
        alert('Unable to retrieve your location.')
      }
    )
  }

  // ─── Apply Coordinates & Switch to 3D Digital Twin ──────────────────────────
  const handleApplyAndSimulate = () => {
    const locItem: LocationItem = {
      id: `site_${exactLat}_${exactLon}`,
      name: placeName,
      lat: exactLat,
      lon: exactLon,
      altitude: exactAlt,
    }
    setSelectedLocation(locItem)
    fetchClimateForLocation(exactLat, exactLon, placeName, exactAlt)
    openWorkbench()
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: 'calc(100vh - var(--topbar-h) - var(--bottombar-h))',
        position: 'relative',
        background: '#0f172a',
        overflow: 'hidden',
      }}
      id="full-map-page"
    >
      {/* ── Top Header Toolbar within Map View ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'rgba(15, 23, 42, 0.96)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          zIndex: 20,
          backdropFilter: 'blur(8px)',
          gap: 12,
        }}
      >
        {/* Left Title & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'rgba(217, 119, 6, 0.18)',
              border: '1px solid var(--solar)',
              color: 'var(--solar)',
            }}
          >
            <Compass size={16} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: '#f8fafc',
                  textTransform: 'uppercase',
                }}
              >
                GEOSPATIAL CLIMATE & EXACT COORDINATE WORKSTATION
              </span>
              <span
                style={{
                  fontSize: 9,
                  background: 'rgba(14, 165, 233, 0.2)',
                  color: '#38bdf8',
                  padding: '1px 6px',
                  borderRadius: 4,
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}
              >
                HIGH PRECISION GIS
              </span>
            </div>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              Click anywhere on the map or drag marker to point exact latitude, longitude, and elevation.
            </span>
          </div>
        </div>

        {/* Search Input in Header */}
        <div style={{ position: 'relative', width: 280 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: '4px 10px',
              gap: 6,
            }}
          >
            <Search size={13} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search place, city or region..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                searchPlaces(e.target.value)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: 11,
                fontFamily: 'var(--font-ui)',
                width: '100%',
              }}
            />
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 34,
                left: 0,
                right: 0,
                background: '#1e293b',
                border: '1px solid #475569',
                borderRadius: 6,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                zIndex: 100,
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    clearSearchResults()
                    setSearchQuery(item.name)
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo([item.lat, item.lon], 9, { duration: 1.2 })
                    }
                    handleExactPointSelect(item.lat, item.lon, item.name)
                  }}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #334155',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: '#e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <strong style={{ color: '#fbbf24' }}>{item.name}</strong>
                  <span style={{ fontSize: 9.5, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                    {item.lat.toFixed(4)}°N, {item.lon.toFixed(4)}°E • Alt: {item.altitude || 'N/A'}m
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Action: Apply and Return to 3D Twin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleUseCurrentGPS}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid #475569',
              color: '#e2e8f0',
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
            title="Locate using your device GPS"
          >
            <LocateFixed size={12} color="#38bdf8" />
            <span>MY GPS</span>
          </button>

          <button
            onClick={openWorkbench}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'transparent',
              border: '1px solid #475569',
              color: '#94a3b8',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
          >
            <span>CANCEL</span>
          </button>

          <button
            onClick={handleApplyAndSimulate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--solar)',
              border: 'none',
              color: '#ffffff',
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(217,119,6,0.35)',
            }}
          >
            <Check size={14} />
            <span>APPLY & SIMULATE IN 3D TWIN</span>
          </button>
        </div>
      </div>

      {/* ── Main Workspace Body (Map + Side HUD Panels) ── */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', minHeight: 0 }}>
        {/* 1. Leaflet Interactive Map Container */}
        <div
          ref={mapContainerRef}
          style={{
            flex: 1,
            width: '100%',
            height: '100%',
            background: '#0f172a',
            zIndex: 1,
          }}
        />

        {/* 2. Floating Live Cursor Coordinate Tracker */}
        {cursorCoords && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              background: 'rgba(15, 23, 42, 0.92)',
              border: '1px solid #334155',
              padding: '4px 10px',
              borderRadius: 4,
              color: '#94a3b8',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              zIndex: 10,
              pointerEvents: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Crosshair size={11} color="var(--solar)" />
            <span>
              CURSOR: {cursorCoords.lat > 0 ? `${cursorCoords.lat}°N` : `${Math.abs(cursorCoords.lat)}°S`},{' '}
              {cursorCoords.lon > 0 ? `${cursorCoords.lon}°E` : `${Math.abs(cursorCoords.lon)}°W`}
            </span>
          </div>
        )}

        {/* 3. Floating Quick Preset Bar (Bottom Left) */}
        <div
          style={{
            position: 'absolute',
            bottom: 44,
            left: 16,
            display: 'flex',
            gap: 6,
            zIndex: 10,
            background: 'rgba(15, 23, 42, 0.94)',
            border: '1px solid #334155',
            padding: '6px 10px',
            borderRadius: 6,
            maxWidth: '60%',
            overflowX: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: '#fbbf24',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              marginRight: 4,
              flexShrink: 0,
            }}
          >
            <MapPin size={11} />
            <span>PRESETS:</span>
          </div>
          {QUICK_PRESETS.map((p) => {
            const isSelected = Math.abs(exactLat - p.lat) < 0.1 && Math.abs(exactLon - p.lon) < 0.1
            return (
              <button
                key={p.id}
                onClick={() => handlePresetSelect(p)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--solar)' : '1px solid #334155',
                  background: isSelected ? 'rgba(217, 119, 6, 0.25)' : 'rgba(30, 41, 59, 0.8)',
                  color: isSelected ? '#fbbf24' : '#cbd5e1',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {p.name.split(',')[0]} ({p.alt}m)
              </button>
            )
          })}
        </div>

        {/* 4. High-Precision Coordinate HUD & Telemetry Card (Right Floating Sidebar) */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 330,
            maxHeight: 'calc(100% - 32px)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid #334155',
            borderRadius: 8,
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            zIndex: 10,
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: 14,
            gap: 12,
          }}
        >
          {/* Active Pinned Point Summary */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: 'var(--solar)', fontWeight: 700, letterSpacing: '0.1em' }}>
                PINNED SITE TELEMETRY
              </span>
              {isResolving && (
                <span style={{ fontSize: 9, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                  Resolving...
                </span>
              )}
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
              {placeName}
            </h3>
            <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
              Zone: <strong style={{ color: '#38bdf8' }}>{activeProfile?.zone || 'High Altitude'}</strong>
            </span>
          </div>

          {/* Manual Coordinate Entry Inputs */}
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: 6,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 9.5, color: '#94a3b8', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              EXACT COORDINATE INPUTS (DECIMAL DEGREES)
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 9, color: '#64748b', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 2 }}>
                  LATITUDE (°N)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={exactLat}
                  onChange={(e) => setExactLat(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: 4,
                    padding: '4px 6px',
                    color: '#fbbf24',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 9, color: '#64748b', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 2 }}>
                  LONGITUDE (°E)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={exactLon}
                  onChange={(e) => setExactLon(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: 4,
                    padding: '4px 6px',
                    color: '#fbbf24',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 9, color: '#64748b', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 2 }}>
                  ALTITUDE / ELEVATION (M)
                </label>
                <input
                  type="number"
                  value={exactAlt}
                  onChange={(e) => setExactAlt(parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: 4,
                    padding: '4px 6px',
                    color: '#38bdf8',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              </div>

              <button
                onClick={handleManualCoordinateJump}
                style={{
                  background: 'rgba(56, 189, 248, 0.2)',
                  border: '1px solid #0284c7',
                  color: '#38bdf8',
                  padding: '6px 10px',
                  borderRadius: 4,
                  fontSize: 10,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: 14,
                }}
              >
                JUMP & PIN
              </button>
            </div>
          </div>

          {/* Live NASA / Open-Meteo Climate Profile Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 9.5, color: '#94a3b8', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              LIVE BIOCLIMATIC ENVIRONMENT METRICS
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{ background: '#1e293b', padding: '6px 8px', borderRadius: 4, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#38bdf8', fontSize: 10 }}>
                  <Thermometer size={12} />
                  <span>AMBIENT TEMP</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {activeProfile?.tOut || '–18 → –8°C'}
                </div>
                <span style={{ fontSize: 8.5, color: '#94a3b8' }}>
                  Mean: {activeProfile?.tOutAvg?.toFixed(1) || '-13.5'}°C
                </span>
              </div>

              <div style={{ background: '#1e293b', padding: '6px 8px', borderRadius: 4, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24', fontSize: 10 }}>
                  <Sun size={12} />
                  <span>SOLAR PEAK</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {activeProfile?.gSouth || '520 W/m²'}
                </div>
                <span style={{ fontSize: 8.5, color: '#94a3b8' }}>
                  {activeProfile?.sunshine || '8.5 h/day'}
                </span>
              </div>

              <div style={{ background: '#1e293b', padding: '6px 8px', borderRadius: 4, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 10 }}>
                  <Wind size={12} />
                  <span>WIND SPEED</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {activeProfile?.wind || '3.2 m/s'}
                </div>
                <span style={{ fontSize: 8.5, color: '#94a3b8' }}>
                  Gusts: {(activeProfile?.windSpeed ? activeProfile.windSpeed * 1.8 : 5.8).toFixed(1)} m/s
                </span>
              </div>

              <div style={{ background: '#1e293b', padding: '6px 8px', borderRadius: 4, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#818cf8', fontSize: 10 }}>
                  <Droplets size={12} />
                  <span>NIGHT LOSS</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {activeProfile?.nightHeatLoss || '–45 W/m²'}
                </div>
                <span style={{ fontSize: 8.5, color: '#94a3b8' }}>
                  Radiant nocturnal flux
                </span>
              </div>
            </div>
          </div>

          {/* DIHAR Passive Solar Design Strategy Priorities */}
          {activeProfile?.designPriorities && activeProfile.designPriorities.length > 0 && (
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                border: '1px solid #334155',
                borderRadius: 6,
                padding: 8,
              }}
            >
              <span style={{ fontSize: 9, color: 'var(--solar)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                DIHAR PASSIVE SOLAR STRATEGY:
              </span>
              <ul style={{ margin: '4px 0 0 14px', fontSize: 9.5, color: '#cbd5e1', lineHeight: 1.4 }}>
                {activeProfile.designPriorities.slice(0, 3).map((pri, i) => (
                  <li key={i}>{pri}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            onClick={handleApplyAndSimulate}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
              border: '1px solid #f59e0b',
              color: '#ffffff',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(217, 119, 6, 0.4)',
            }}
          >
            <Check size={16} />
            <span>APPLY & SIMULATE IN 3D TWIN</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default FullMapPage
