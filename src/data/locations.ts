/**
 * locations.ts — Bioclimatic profiles and environmental datasets for THERMO-SHIELD.
 *
 * Covers 5 major Indian climatic zones:
 * - Leh, Ladakh (Cold & Arid / High Altitude)
 * - Jaisalmer, Rajasthan (Hot & Dry / Desert)
 * - New Delhi, NCR (Composite / Extreme Plains)
 * - Kochi, Kerala (Warm & Humid / Coastal)
 * - Srinagar, Kashmir (Cold & Cloudy / Valley)
 *
 * PROTOTYPE NOTICE: Values are controlled representative reference datasets
 * for demonstration purposes and not yet validated against CFD/ANSYS solver outputs.
 */

export interface ClimateProfile {
  id:               string
  name:             string
  region:           string
  zone:             string
  season:           string
  altitude:         string
  altitudeNum:      number   // meters
  coordinates:      string
  lat:              number
  lon:              number
  statusLine:       string
  tOut:             string
  tOutMin:          number   // °C
  tOutMax:          number   // °C
  tOutAvg:          number   // °C
  wind:             string
  windSpeed:        number   // m/s
  gSouth:           string
  gSouthValue:      number   // W/m²
  ambientTempRange: string
  solarPotential:   string
  sunshine:         string
  nightHeatLoss:    string
  solarOpportunity: string
  designPriorities: string[]
  // 3D Scene environmental styling tokens
  sceneTheme: {
    groundColor:    string
    skyColor:       string
    ambientColor:   string
    ambientIntensity: number
    sunColor:       string
    sunElevation:   number   // degrees
    sunAzimuth:     number   // degrees
    gridColor:      string
    gridCenterColor:string
  }
}

export const LOCATIONS: Record<string, ClimateProfile> = {
  leh: {
    id:               'leh',
    name:             'Leh, Ladakh',
    region:           'Ladakh (High Altitude Cold Desert)',
    zone:             'Cold & Arid',
    season:           'Winter (January)',
    altitude:         '3524m',
    altitudeNum:      3524,
    coordinates:      '34.15°N  77.58°E',
    lat:              34.15,
    lon:              77.58,
    statusLine:       'LEH • LADAKH • WINTER • 24-HOUR SIMULATION',
    tOut:             '–18 → –8°C',
    tOutMin:          -18.0,
    tOutMax:          -8.2,
    tOutAvg:          -13.5,
    wind:             '3.2 m/s',
    windSpeed:        3.2,
    gSouth:           '520 W/m²',
    gSouthValue:      520,
    ambientTempRange: '–18.0°C to –8.2°C (Mean: –13.5°C)',
    solarPotential:   '520 W/m² (South façade peak)',
    sunshine:         '8.5 h/day clear sky direct irradiance',
    nightHeatLoss:    '–45 W/m² (radiant loss to cold night sky)',
    solarOpportunity: '08:00–16:00 (high diurnal window)',
    designPriorities: [
      'Maximise direct solar gain via South glazing',
      'High envelope insulation (R ≥ 3.5 m²K/W)',
      'High thermal mass to buffer night temp drop',
      'Minimise North/East infiltration & aperture area',
    ],
    sceneTheme: {
      groundColor:     '#dbe4ed',
      skyColor:        '#e8edf2',
      ambientColor:    '#ffffff',
      ambientIntensity: 0.65,
      sunColor:        '#fffbe8',
      sunElevation:    42.3,
      sunAzimuth:      185.0,
      gridColor:       '#cbd5e1',
      gridCenterColor: '#94a3b8',
    },
  },

  jaisalmer: {
    id:               'jaisalmer',
    name:             'Jaisalmer, Rajasthan',
    region:           'Thar Desert',
    zone:             'Hot & Dry',
    season:           'Winter / Design Day',
    altitude:         '225m',
    altitudeNum:      225,
    coordinates:      '26.91°N  70.90°E',
    lat:              26.91,
    lon:              70.90,
    statusLine:       'JAISALMER • THAR DESERT • HOT & DRY • 24-HOUR SIMULATION',
    tOut:             '8 → 26°C',
    tOutMin:          8.0,
    tOutMax:          26.5,
    tOutAvg:          17.2,
    wind:             '4.1 m/s',
    windSpeed:        4.1,
    gSouth:           '580 W/m²',
    gSouthValue:      580,
    ambientTempRange: '8.0°C to 26.5°C (Mean: 17.2°C)',
    solarPotential:   '580 W/m² (High horizontal & south solar load)',
    sunshine:         '9.2 h/day intense desert radiation',
    nightHeatLoss:    '–22 W/m² (moderate nocturnal sky radiation)',
    solarOpportunity: 'Daytime solar avoidance; night thermal release',
    designPriorities: [
      'Deep overhangs & jali shading on all glazed surfaces',
      'High thermal mass walls (e.g. sandstone) for diurnal lag',
      'Night-flush ventilation to dump accumulated heat',
      'Compact courtyard morphology to reduce envelope exposure',
    ],
    sceneTheme: {
      groundColor:     '#ebdcc4',
      skyColor:        '#f6efe3',
      ambientColor:    '#fff7e6',
      ambientIntensity: 0.75,
      sunColor:        '#ffecb3',
      sunElevation:    54.0,
      sunAzimuth:      178.0,
      gridColor:       '#d7c4a8',
      gridCenterColor: '#bfa482',
    },
  },

  delhi: {
    id:               'delhi',
    name:             'New Delhi, NCR',
    region:           'Indo-Gangetic Plain',
    zone:             'Composite',
    season:           'Winter (January)',
    altitude:         '216m',
    altitudeNum:      216,
    coordinates:      '28.61°N  77.21°E',
    lat:              28.61,
    lon:              77.21,
    statusLine:       'NEW DELHI • COMPOSITE CLIMATE • WINTER • 24-HOUR SIMULATION',
    tOut:             '5 → 21°C',
    tOutMin:          5.5,
    tOutMax:          21.0,
    tOutAvg:          13.2,
    wind:             '2.1 m/s',
    windSpeed:        2.1,
    gSouth:           '460 W/m²',
    gSouthValue:      460,
    ambientTempRange: '5.5°C to 21.0°C (Mean: 13.2°C)',
    solarPotential:   '460 W/m² (Winter diffuse attenuation)',
    sunshine:         '6.8 h/day moderate winter sunshine',
    nightHeatLoss:    '–28 W/m² (moderate radiative cooling)',
    solarOpportunity: 'Passive winter heating with seasonal summer shading',
    designPriorities: [
      'Flexible envelope adaptability for winter heating & summer cooling',
      'Medium-high thermal mass to stabilize diurnal swings',
      'Airtight building envelope with controlled fresh air filtration',
      'South-oriented aperture with seasonal external louvers',
    ],
    sceneTheme: {
      groundColor:     '#dcdfdc',
      skyColor:        '#e9ede9',
      ambientColor:    '#f8faf8',
      ambientIntensity: 0.62,
      sunColor:        '#fffde7',
      sunElevation:    48.0,
      sunAzimuth:      182.0,
      gridColor:       '#cbd0cb',
      gridCenterColor: '#9fa89f',
    },
  },

  kochi: {
    id:               'kochi',
    name:             'Kochi, Kerala',
    region:           'Malabar Coast',
    zone:             'Warm & Humid',
    season:           'Annual Tropical',
    altitude:         '4m',
    altitudeNum:      4,
    coordinates:      '9.93°N  76.27°E',
    lat:              9.93,
    lon:              76.27,
    statusLine:       'KOCHI • MALABAR COAST • WARM & HUMID • 24-HOUR SIMULATION',
    tOut:             '23 → 32°C',
    tOutMin:          23.5,
    tOutMax:          32.0,
    tOutAvg:          27.8,
    wind:             '3.8 m/s',
    windSpeed:        3.8,
    gSouth:           '490 W/m²',
    gSouthValue:      490,
    ambientTempRange: '23.5°C to 32.0°C (Mean: 27.8°C)',
    solarPotential:   '490 W/m² (High zenith & diffuse radiation)',
    sunshine:         '7.4 h/day coastal sunshine',
    nightHeatLoss:    '–12 W/m² (minimal radiant cooling due to humidity)',
    solarOpportunity: 'Total solar avoidance — full envelope protection',
    designPriorities: [
      'Maximize cross-ventilation & air velocity across interior',
      'Lightweight envelope with low thermal mass & high reflectivity',
      'Extended sloping roof eaves to shed torrential monsoon rain & sun',
      'Elevated stilt / plinth for ground moisture isolation',
    ],
    sceneTheme: {
      groundColor:     '#d2e2d6',
      skyColor:        '#e5efe8',
      ambientColor:    '#f0fdf4',
      ambientIntensity: 0.70,
      sunColor:        '#ffffff',
      sunElevation:    68.0,
      sunAzimuth:      180.0,
      gridColor:       '#b8d0be',
      gridCenterColor: '#8da894',
    },
  },

  srinagar: {
    id:               'srinagar',
    name:             'Srinagar, Kashmir',
    region:           'Kashmir Valley',
    zone:             'Cold & Cloudy',
    season:           'Winter (January)',
    altitude:         '1585m',
    altitudeNum:      1585,
    coordinates:      '34.08°N  74.80°E',
    lat:              34.08,
    lon:              74.80,
    statusLine:       'SRINAGAR • KASHMIR VALLEY • COLD & CLOUDY • 24-HOUR SIMULATION',
    tOut:             '–4 → 6°C',
    tOutMin:          -4.5,
    tOutMax:          6.5,
    tOutAvg:          1.0,
    wind:             '1.8 m/s',
    windSpeed:        1.8,
    gSouth:           '380 W/m²',
    gSouthValue:      380,
    ambientTempRange: '–4.5°C to 6.5°C (Mean: 1.0°C)',
    solarPotential:   '380 W/m² (Cloud & snow-cast irradiance)',
    sunshine:         '4.5 h/day frequent winter cloud cover',
    nightHeatLoss:    '–35 W/m² (radiant loss through cold valley air)',
    solarOpportunity: 'Capture diffuse & direct solar; minimize conductive loss',
    designPriorities: [
      'Super-insulated envelope to mitigate low sunshine days',
      'Pitched roof design (Dhajji-Dewari inspired) for snow shedding',
      'Double / triple glazing with low-E coatings on all apertures',
      'Airtight air-lock vestibules (Bukhari heating compatible)',
    ],
    sceneTheme: {
      groundColor:     '#e0e7ee',
      skyColor:        '#edf2f7',
      ambientColor:    '#f1f5f9',
      ambientIntensity: 0.58,
      sunColor:        '#f8fafc',
      sunElevation:    38.0,
      sunAzimuth:      186.0,
      gridColor:       '#cbd5e1',
      gridCenterColor: '#94a3b8',
    },
  },
}

export function getLocationProfile(id: string): ClimateProfile {
  return LOCATIONS[id] ?? LOCATIONS.leh
}
