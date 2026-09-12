/**
 * frontend/src/lib/climateAdapter.ts
 *
 * Converts raw backend climate telemetry (from Open-Meteo & NASA POWER)
 * into a rich, structured ClimateProfile with automated bioclimatic zone derivation,
 * dynamic design priorities, and 3D scene lighting configurations.
 */

import type { ClimateProfile, SceneTheme } from '@/domain'

/**
 * Derives bioclimatic zone classification from temperature, altitude, and humidity.
 */
export function deriveBioclimaticZone(
  avgTemp: number,
  minTemp: number,
  maxTemp: number,
  altitude: number,
  humidity: number
): { zone: string; region: string } {
  if (minTemp <= -5 || (avgTemp < 8 && altitude >= 2000)) {
    if (humidity < 45) {
      return {
        zone: 'Cold & Arid',
        region: altitude > 3000 ? 'High Altitude Cold Desert' : 'Cold Mountainous Region',
      }
    }
    return {
      zone: 'Cold & Cloudy',
      region: 'Alpine Valley / Sub-Himalayan',
    }
  }

  if (avgTemp >= 24) {
    if (humidity >= 60) {
      return {
        zone: 'Warm & Humid',
        region: 'Tropical Maritime / Coastal Zone',
      }
    }
    return {
      zone: 'Hot & Dry',
      region: 'Arid / Semi-Arid Desert',
    }
  }

  if (maxTemp - minTemp >= 14 || (minTemp <= 10 && maxTemp >= 26)) {
    return {
      zone: 'Composite',
      region: 'Inland Continental Plains',
    }
  }

  return {
    zone: 'Temperate',
    region: 'Moderate Hill Station / Plateau',
  }
}

/**
 * Generates engineering design priorities based on the bioclimatic regime.
 */
export function deriveDesignPriorities(
  zone: string,
  _minTemp: number,
  _maxTemp: number,
  _solarPeak: number,
  windAvg: number,
  snowMm: number
): string[] {
  const priorities: string[] = []

  if (zone.includes('Cold & Arid')) {
    priorities.push('Maximise direct solar gain via South-facing glazing')
    priorities.push('Super-insulated envelope (R ≥ 3.5 m²·K/W, insulation ≥ 100mm)')
    priorities.push('High thermal mass (stone/adobe) to buffer extreme night plunge')
    priorities.push('Minimise North/East infiltration and seal thermal bridges')
  } else if (zone.includes('Cold & Cloudy')) {
    priorities.push('Super-insulated envelope to mitigate low diffuse solar days')
    priorities.push('Pitched roof design (Dhajji-Dewari inspired) for snow shedding')
    priorities.push('Double / triple glazing with Low-E coatings on all apertures')
    priorities.push('Airtight air-lock vestibule for Bukhari / heating retention')
  } else if (zone.includes('Hot & Dry')) {
    priorities.push('Deep overhangs & jali shading on all glazed surfaces')
    priorities.push('High thermal mass walls (sandstone/adobe) for 8–10h diurnal lag')
    priorities.push('Nocturnal convective ventilation to dump daytime heat buildup')
    priorities.push('Compact courtyard morphology to reduce solar envelope exposure')
  } else if (zone.includes('Warm & Humid')) {
    priorities.push('Maximize continuous cross-ventilation & high airflow permeability')
    priorities.push('Lightweight envelope with low thermal mass & high reflectivity')
    priorities.push('Extended sloping roof eaves to shed monsoon rain & high sun')
    priorities.push('Elevated plinth / stilt foundation for ground moisture protection')
  } else if (zone.includes('Composite')) {
    priorities.push('Flexible envelope adaptability for winter heating & summer cooling')
    priorities.push('Medium-high thermal mass to stabilize large diurnal swings')
    priorities.push('South-oriented aperture with seasonal external shading louvers')
    priorities.push('Controlled mechanical / night-flush ventilation regime')
  } else {
    priorities.push('Balanced envelope insulation with standard thermal mass')
    priorities.push('Daylight optimization with moderate south-facing glazed area')
    priorities.push('Natural ventilation paths with operable windows')
    priorities.push('Weather-resistant exterior cladding')
  }

  if (snowMm > 50) {
    priorities.push(`Structural reinforcement for ${snowMm.toFixed(0)}mm annual snow load`)
  }

  if (windAvg > 5.0) {
    priorities.push(`Aerodynamic envelope profiling against ${windAvg.toFixed(1)} m/s high winds`)
  }

  return priorities.slice(0, 4)
}

/**
 * Derives 3D scene lighting & background palette based on site latitude and climatic zone.
 */
export function deriveSceneTheme(zone: string, lat: number): SceneTheme {
  const isHighAltitude = zone.includes('Cold & Arid') || zone.includes('Cold & Cloudy')
  const isTropical = zone.includes('Warm & Humid')
  const isDesert = zone.includes('Hot & Dry')

  if (isHighAltitude) {
    return {
      groundColor: '#dbe4ed',
      skyColor: '#e8edf2',
      ambientColor: '#ffffff',
      ambientIntensity: 0.65,
      sunColor: '#fffbe8',
      sunElevation: Math.max(30, 60 - Math.abs(lat) * 0.6),
      sunAzimuth: 185.0,
      gridColor: '#cbd5e1',
      gridCenterColor: '#94a3b8',
    }
  }

  if (isDesert) {
    return {
      groundColor: '#ebdcc4',
      skyColor: '#f6efe3',
      ambientColor: '#fff7e6',
      ambientIntensity: 0.75,
      sunColor: '#ffecb3',
      sunElevation: 54.0,
      sunAzimuth: 178.0,
      gridColor: '#d7c4a8',
      gridCenterColor: '#bfa482',
    }
  }

  if (isTropical) {
    return {
      groundColor: '#d2e2d6',
      skyColor: '#e5efe8',
      ambientColor: '#f0fdf4',
      ambientIntensity: 0.70,
      sunColor: '#ffffff',
      sunElevation: 68.0,
      sunAzimuth: 180.0,
      gridColor: '#b8d0be',
      gridCenterColor: '#8da894',
    }
  }

  // Composite / Default
  return {
    groundColor: '#dcdfdc',
    skyColor: '#e9ede9',
    ambientColor: '#f8faf8',
    ambientIntensity: 0.62,
    sunColor: '#fffde7',
    sunElevation: 48.0,
    sunAzimuth: 182.0,
    gridColor: '#cbd0cb',
    gridCenterColor: '#9fa89f',
  }
}

/**
 * Transforms raw backend API response into a full frontend ClimateProfile.
 */
export function adaptBackendClimateToProfile(data: any): ClimateProfile {
  const loc = data.location || {}
  const lat = Number(loc.lat ?? 34.1526)
  const lon = Number(loc.lon ?? 77.5771)
  const altitude = Number(loc.altitude ?? 0)
  const name = loc.name || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`

  const minTemp = Number(data.ambientTempRange?.min ?? -15.0)
  const maxTemp = Number(data.ambientTempRange?.max ?? -5.0)
  const avgTemp = Number(data.ambientTempRange?.avg ?? -10.0)

  const dailyKwh = Number(data.solarIrradiance?.dailyTotalKwh ?? 4.5)
  const peakWm2 = Number(data.solarIrradiance?.peakWm2 ?? 500.0)

  const avgWind = Number(data.windSpeed?.avgMs ?? 3.0)
  const maxWind = Number(data.windSpeed?.maxMs ?? 7.0)

  const humidity = Number(data.humidity?.avgPercent ?? 40.0)
  const snowMm = Number(data.snowData?.annualSnowfallMm ?? 0.0)
  const snowDepthCm = Number(data.snowData?.maxSnowDepthCm ?? 0.0)

  const { zone, region } = deriveBioclimaticZone(avgTemp, minTemp, maxTemp, altitude, humidity)
  const designPriorities = deriveDesignPriorities(zone, minTemp, maxTemp, peakWm2, avgWind, snowMm)
  const sceneTheme = deriveSceneTheme(zone, lat)

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24) || 'custom_loc'

  return {
    id,
    name,
    region,
    zone,
    season: 'Real-Time Climate Analysis',
    altitude: `${altitude.toFixed(0)}m`,
    altitudeNum: altitude,
    coordinates: `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}  ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`,
    lat,
    lon,
    statusLine: `${name.toUpperCase()} • ${zone.toUpperCase()} • REAL CLIMATE`,
    tOut: `${minTemp.toFixed(1)} → ${maxTemp.toFixed(1)}°C`,
    tOutMin: minTemp,
    tOutMax: maxTemp,
    tOutAvg: avgTemp,
    wind: `${avgWind.toFixed(1)} m/s (Gust: ${maxWind.toFixed(1)} m/s)`,
    windSpeed: avgWind,
    gSouth: `${peakWm2.toFixed(0)} W/m²`,
    gSouthValue: peakWm2,
    ambientTempRange: `${minTemp > 0 ? '+' : ''}${minTemp.toFixed(1)}°C to ${maxTemp > 0 ? '+' : ''}${maxTemp.toFixed(1)}°C (Mean: ${avgTemp.toFixed(1)}°C)`,
    solarPotential: `${peakWm2.toFixed(0)} W/m² (${dailyKwh.toFixed(2)} kWh/m²/day)`,
    sunshine: `${Math.min(12, Math.max(4, (dailyKwh / 0.6))).toFixed(1)} h/day insolation`,
    nightHeatLoss: `${minTemp < 0 ? '–' : ''}${Math.abs(minTemp * 2.2 + 15).toFixed(0)} W/m² (Radiant nocturnal flux)`,
    solarOpportunity: minTemp < 10 ? 'High solar gain window (08:30–15:30)' : 'Solar avoidance & shading focus',
    designPriorities,
    sceneTheme,
    // Extended fields for rich technical UI
    humidity,
    snowfallMm: snowMm,
    snowDepthCm: snowDepthCm,
    source: data.source || 'merged',
    fetchedAt: data.fetchedAt || new Date().toISOString(),
    hourlyOutdoorTemp: data.hourlyOutdoorTemp,
    hourlySolarRadiation: data.hourlySolarRadiation,
  }
}
