/**
 * frontend/src/features/location/LocationSearchBox.tsx
 *
 * Location search autocomplete, coordinate inputs, quick bioclimatic presets,
 * and prominent "Analyze Location" trigger for Open-Meteo & NASA POWER telemetry.
 */

import { useState, useEffect, useRef, type FC } from 'react'
import {
  Search,
  MapPin,
  Compass,
  Loader2,
  X,
  AlertCircle,
  Database,
  ArrowRight,
} from 'lucide-react'
import { useClimateStore, type LocationItem } from '@/store/climateStore'
import { LocationPickerMap } from './LocationPickerMap'

export const LocationSearchBox: FC = () => {
  const {
    selectedLocation,
    setSelectedLocation,
    activeProfile,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchPlaces,
    clearSearchResults,
    fetchClimateForLocation,
    setPharagrName,
  } = useClimateStore()

  const [localLat, setLocalLat] = useState<number>(selectedLocation.lat)
  const [localLon, setLocalLon] = useState<number>(selectedLocation.lon)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Sync local inputs when selectedLocation changes externally
  useEffect(() => {
    setLocalLat(selectedLocation.lat)
    setLocalLon(selectedLocation.lon)
  }, [selectedLocation.lat, selectedLocation.lon])

  // Debounced geocoding search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      clearSearchResults()
      setIsDropdownOpen(false)
      return
    }

    const timer = setTimeout(() => {
      searchPlaces(searchQuery)
      setIsDropdownOpen(true)
    }, 350)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectResult = (item: LocationItem) => {
    setSelectedLocation(item)
    setSearchQuery(item.name)
    setIsDropdownOpen(false)
    // Auto-analyze upon selecting search result
    fetchClimateForLocation(item.lat, item.lon, item.name, item.altitude)
  }

  const handleMapPinChange = (lat: number, lon: number) => {
    setLocalLat(lat)
    setLocalLon(lon)
    const updated: LocationItem = {
      ...selectedLocation,
      lat,
      lon,
      name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
    }
    setSelectedLocation(updated)
  }

  const handleAnalyzeClick = () => {
    fetchClimateForLocation(localLat, localLon, selectedLocation.name, selectedLocation.altitude)
  }

  return (
    <div className="location-flow-container" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* ── Pharagr Name Display & Entry ── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-base)',
          borderRadius: 3,
          padding: '4px 6px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 7.5,
              fontWeight: 700,
              color: 'var(--solar)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Pharagr Name
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 7,
              color: 'var(--text-muted)',
            }}
          >
            SECTOR ID
          </span>
        </div>
        <input
          id="input-pharagr-name"
          type="text"
          value={selectedLocation.pharagrName || 'Pharagr Sector Alpha'}
          onChange={(e) => setPharagrName(e.target.value)}
          placeholder="Enter Pharagr Name..."
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            padding: 0,
          }}
        />
      </div>

      {/* ── 1. Search Box with Autocomplete ── */}
      <div ref={searchContainerRef} style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-base)',
            borderRadius: 3,
            padding: '2px 6px',
            gap: 6,
          }}
        >
          <Search size={11} color="var(--text-muted)" />
          <input
            id="location-search-input"
            type="text"
            placeholder="Search place (e.g. Leh, Kargil, Kochi)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setIsDropdownOpen(true)
            }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              padding: '3px 0',
            }}
          />
          {isSearching && <Loader2 size={11} className="spin" color="var(--solar)" />}
          {searchQuery && !isSearching && (
            <button
              onClick={() => {
                setSearchQuery('')
                clearSearchResults()
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 1,
              }}
            >
              <X size={10} />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isDropdownOpen && searchResults.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 100,
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-bright)',
              borderRadius: 3,
              marginTop: 2,
              maxHeight: 180,
              overflowY: 'auto',
              boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
            }}
          >
            {searchResults.map((item, idx) => (
              <div
                key={item.id || idx}
                onClick={() => handleSelectResult(item)}
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid var(--border-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 8.5,
                  fontFamily: 'var(--font-mono)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={10} color="var(--solar)" />
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 7.5, color: 'var(--text-muted)' }}>
                      {item.lat.toFixed(2)}°, {item.lon.toFixed(2)}°
                    </div>
                  </div>
                </div>
                {item.altitude > 0 && (
                  <span
                    style={{
                      fontSize: 7.5,
                      padding: '1px 4px',
                      borderRadius: 2,
                      background: 'var(--cool-glow)',
                      color: 'var(--cool)',
                      border: '1px solid var(--cool)',
                    }}
                  >
                    {item.altitude.toFixed(0)}m
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. Embedded Interactive Coordinate Map ── */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 7.5,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Compass size={9} color="var(--solar)" />
            Interactive Coordinate Map
          </span>
        </div>

        <LocationPickerMap
          lat={localLat}
          lon={localLon}
          name={selectedLocation.name}
          onLocationChange={handleMapPinChange}
          height={150}
        />
      </div>

      {/* ── 4. Coordinates Readout / Direct Entry ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 4,
          background: 'var(--bg-surface)',
          padding: '4px 6px',
          borderRadius: 2,
          border: '1px solid var(--border-dim)',
        }}
      >
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Latitude
          </span>
          <input
            type="number"
            value={localLat}
            step={0.01}
            min={-90}
            max={90}
            onChange={(e) => {
              const v = Number(e.target.value)
              setLocalLat(v)
              handleMapPinChange(v, localLon)
            }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              padding: 0,
              outline: 'none',
            }}
          />
        </div>
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Longitude
          </span>
          <input
            type="number"
            value={localLon}
            step={0.01}
            min={-180}
            max={180}
            onChange={(e) => {
              const v = Number(e.target.value)
              setLocalLon(v)
              handleMapPinChange(localLat, v)
            }}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              padding: 0,
              outline: 'none',
            }}
          />
        </div>
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Altitude
          </span>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              color: 'var(--cool)',
            }}
          >
            {activeProfile.altitude || `${selectedLocation.altitude}m`}
          </div>
        </div>
      </div>

      {/* ── 5. ANALYZE LOCATION Button ── */}
      <button
        id="btn-analyze-location"
        onClick={handleAnalyzeClick}
        disabled={isLoading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          background: isLoading ? 'var(--bg-hover)' : 'var(--solar)',
          color: isLoading ? 'var(--text-muted)' : '#000000',
          border: 'none',
          borderRadius: 2,
          padding: '6px 10px',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          boxShadow: isLoading ? 'none' : '0 2px 8px rgba(245, 158, 11, 0.3)',
          transition: 'all 150ms',
        }}
      >
        {isLoading ? (
          <>
            <Loader2 size={11} className="spin" color="var(--solar)" />
            <span>Fetching Climate Telemetry…</span>
          </>
        ) : (
          <>
            <Database size={11} />
            <span>Analyze Location</span>
            <ArrowRight size={11} />
          </>
        )}
      </button>

      {/* ── 6. Error Banner (Only shown on error, raw debug content removed) ── */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid #ef4444',
            borderRadius: 2,
            padding: '5px 7px',
            fontSize: 7.5,
            fontFamily: 'var(--font-mono)',
            color: '#ef4444',
            lineHeight: 1.3,
          }}
        >
          <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>{error}</div>
        </div>
      )}
    </div>
  )
}

export default LocationSearchBox
