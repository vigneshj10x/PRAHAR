"""
simulation_engine/geometry.py

Geometric and area calculation utilities for shelter envelopes.
Supports 25 distinct architectural, high-altitude and extreme-climate shelter geometries:

1. Standard & Prismatic:
   - 'rectangular': Standard box with flat/low-slope insulated roof
   - 'monopitch': Single-slope solar shed roof
   - 'gable': Symmetrical dual-pitch gable roof
   - 'hip_roof': 4-slope pyramidal hip roof
   - 'mansard': Double-slope high-clearance mansard curb roof
   - 'gambrel': Dual-pitch barn/quonset hybrid arch

2. Curved & Vaulted:
   - 'semidome': Quonset / semi-cylinder vault
   - 'quonset_extended': High-arch Quonset with vertical wall stems
   - 'barrel_vault': Gothic / elongated barrel vault
   - 'hyperbolic_paraboloid': Double-curved saddle hypar roof
   - 'torus_inflatable': Pressurized toroidal extreme-altitude pod

3. Domes & Geodesics:
   - 'geodesic_dome': 3V geodesic icosahedral hemisphere
   - 'igloo_catenary': Hyper-insulated catenary igloo dome
   - 'pyramidal': 4-sided symmetrical high-snow pyramid
   - 'conical_teepee': High-pitch conical alpine bivouac

4. Polygonal & High-Wind:
   - 'aframe': Steep-pitch triangular prism (snow/avalanche shedding)
   - 'hexagonal_yurt': Hexagonal nomadic yurt / ger
   - 'octagonal_pod': Octagonal high-wind defense bunker
   - 'diamond_faceted': Faceted crystalline stealth storm shelter
   - 'wedge_supersonic': Aerodynamic windward wedge shelter

5. Specialized & Climate-Adaptive:
   - 'bifacial_shed': Bifacial dual-slope solar thermal collector
   - 'stilt_elevated': Elevated stilt flood-resistant tropical pod
   - 'bunker_bermed': Subterranean earth-bermed thermal mass bunker
   - 'modular_hex_cluster': 3-cell hexagonal modular cluster
   - 'origami_accordion': Deployable pleated origami rapid shelter
"""

import math
from dataclasses import dataclass
from typing import List

ALL_SHAPES: List[str] = [
    "rectangular",
    "monopitch",
    "gable",
    "hip_roof",
    "mansard",
    "gambrel",
    "semidome",
    "quonset_extended",
    "barrel_vault",
    "hyperbolic_paraboloid",
    "torus_inflatable",
    "geodesic_dome",
    "igloo_catenary",
    "pyramidal",
    "conical_teepee",
    "aframe",
    "hexagonal_yurt",
    "octagonal_pod",
    "diamond_faceted",
    "wedge_supersonic",
    "bifacial_shed",
    "stilt_elevated",
    "bunker_bermed",
    "modular_hex_cluster",
    "origami_accordion",
]


@dataclass(frozen=True)
class EnvelopeGeometry:
    shape: str
    length: float            # meters
    width: float             # meters
    height: float            # meters at apex
    floor_area: float        # m²
    wall_area_total: float   # m² (opaque gross walls)
    roof_area: float         # m²
    south_facing_area: float # m² (façade receiving primary solar aperture)
    north_facing_area: float # m²
    east_facing_area: float  # m²
    west_facing_area: float  # m²
    envelope_area: float     # m² (total shell: walls + roof)
    volume: float            # m³ interior volume
    av_ratio: float          # Surface-area-to-volume ratio (1/m)


def calculate_geometry(
    shape: str,
    length: float,
    width: float,
    height: float,
    orientation_deg: float = 180.0,
) -> EnvelopeGeometry:
    """
    Computes exact surface areas, orientation projections, and volume for 25 shelter geometries.
    Orientation is clockwise from North (0°=N, 90°=E, 180°=S, 270°=W).
    Default 180° points the primary longitudinal length along East-West, facing South.
    """
    length = max(1.0, float(length))
    width = max(1.0, float(width))
    height = max(1.0, float(height))
    shape = str(shape).lower().strip()
    if shape not in ALL_SHAPES:
        shape = "rectangular"

    rad = math.radians(orientation_deg - 180.0)
    cos_fac = abs(math.cos(rad))
    sin_fac = abs(math.sin(rad))

    # 1. Standard Rectangular Box
    if shape == "rectangular":
        floor_area = length * width
        wall_area_long = length * height
        wall_area_short = width * height
        wall_area_total = 2.0 * (wall_area_long + wall_area_short)
        roof_area = length * width
        volume = length * width * height
        south_facing_area = wall_area_long * cos_fac + wall_area_short * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = wall_area_long * sin_fac + wall_area_short * cos_fac
        west_facing_area = east_facing_area

    # 2. Monopitch Shed Roof
    elif shape == "monopitch":
        floor_area = length * width
        h_low = height * 0.6
        h_high = height
        wall_south = length * h_high
        wall_north = length * h_low
        wall_side = width * (h_low + h_high) / 2.0
        wall_area_total = wall_south + wall_north + 2.0 * wall_side
        roof_slope_len = math.sqrt(width ** 2 + (h_high - h_low) ** 2)
        roof_area = length * roof_slope_len
        volume = length * width * (h_low + h_high) / 2.0
        # Glazing installed on vertical wall facade only (not roof slope)
        south_facing_area = wall_south * cos_fac + wall_side * sin_fac
        north_facing_area = wall_north * cos_fac + wall_side * sin_fac
        east_facing_area = wall_side * cos_fac + wall_south * sin_fac
        west_facing_area = east_facing_area

    # 3. Pitched Gable Roof
    elif shape == "gable":
        floor_area = length * width
        eave_h = height * 0.65
        gable_h = height - eave_h
        wall_eaves = 2.0 * (length * eave_h)
        wall_gables = 2.0 * (width * eave_h + 0.5 * width * gable_h)
        wall_area_total = wall_eaves + wall_gables
        rafter_len = math.sqrt((width / 2.0) ** 2 + gable_h ** 2)
        roof_area = 2.0 * (rafter_len * length)
        volume = (length * width * eave_h) + (0.5 * width * gable_h * length)
        # Vertical south wall facade (excluding sloped roof rafters)
        south_facing_area = (length * eave_h) * cos_fac + (wall_gables / 2.0) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = (wall_gables / 2.0) * cos_fac + (length * eave_h) * sin_fac
        west_facing_area = east_facing_area

    # 4. Pyramidal Hip Roof
    elif shape == "hip_roof":
        floor_area = length * width
        eave_h = height * 0.60
        hip_h = height - eave_h
        wall_area_total = 2.0 * (length + width) * eave_h
        # 4 sloping trapezoidal/triangular roof facets
        slope_w = math.sqrt((width / 2.0) ** 2 + hip_h ** 2)
        slope_l = math.sqrt((length / 2.0) ** 2 + hip_h ** 2)
        roof_area = 2.0 * (0.5 * width * slope_l) + 2.0 * (0.5 * length * slope_w)
        volume = (length * width * eave_h) + (1.0 / 3.0 * length * width * hip_h)
        south_facing_area = (length * eave_h) * cos_fac + (width * eave_h) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = (width * eave_h) * cos_fac + (length * eave_h) * sin_fac
        west_facing_area = east_facing_area

    # 5. Mansard Curb Roof
    elif shape == "mansard":
        floor_area = length * width
        base_h = height * 0.5
        steep_h = height * 0.35
        top_h = height * 0.15
        wall_area_total = 2.0 * (length + width) * base_h
        mansard_slope_area = 2.0 * (length + width) * math.sqrt((0.15 * width) ** 2 + steep_h ** 2)
        top_flat_area = (length * 0.7) * (width * 0.7)
        roof_area = mansard_slope_area + top_flat_area
        volume = (length * width * base_h) + (length * width * 0.85 * (steep_h + top_h))
        south_facing_area = (length * base_h) * cos_fac + (width * base_h) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = (width * base_h) * cos_fac + (length * base_h) * sin_fac
        west_facing_area = east_facing_area

    # 6. Gambrel Arch
    elif shape == "gambrel":
        floor_area = length * width
        base_h = height * 0.4
        wall_area_total = 2.0 * (length + width) * base_h
        gambrel_rafters = 2.0 * (math.sqrt((width * 0.25) ** 2 + (height * 0.35) ** 2) + math.sqrt((width * 0.25) ** 2 + (height * 0.25) ** 2))
        roof_area = gambrel_rafters * length
        volume = (length * width * base_h) + (0.75 * width * (height - base_h) * length)
        south_facing_area = (length * base_h) * cos_fac + (width * height * 0.5) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = (width * height * 0.5) * cos_fac + (length * base_h) * sin_fac
        west_facing_area = east_facing_area

    # 7. Semi-Dome / Quonset Vault
    elif shape == "semidome":
        radius = width / 2.0
        floor_area = length * width
        end_wall_area = math.pi * (radius ** 2) / 2.0
        wall_area_total = 2.0 * end_wall_area
        roof_area = math.pi * radius * length
        volume = (math.pi * (radius ** 2) / 2.0) * length
        south_facing_area = (length * height * 0.64) * cos_fac + end_wall_area * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = end_wall_area * cos_fac + (length * height * 0.64) * sin_fac
        west_facing_area = east_facing_area

    # 8. Quonset Extended (with Vertical Stems)
    elif shape == "quonset_extended":
        floor_area = length * width
        stem_h = height * 0.35
        arch_h = height - stem_h
        radius = width / 2.0
        end_wall_area = (width * stem_h) + (math.pi * (radius ** 2) / 2.0)
        wall_area_total = (2.0 * length * stem_h) + (2.0 * end_wall_area)
        roof_area = math.pi * radius * length
        volume = (length * width * stem_h) + ((math.pi * (radius ** 2) / 2.0) * length)
        south_facing_area = (length * (stem_h + arch_h * 0.64)) * cos_fac + end_wall_area * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = end_wall_area * cos_fac + (length * (stem_h + arch_h * 0.64)) * sin_fac
        west_facing_area = east_facing_area

    # 9. Barrel Vault (Gothic / Elongated)
    elif shape == "barrel_vault":
        floor_area = length * width
        radius = math.sqrt((width / 2.0) ** 2 + height ** 2)
        end_wall_area = 0.5 * math.pi * (width / 2.0) * height
        wall_area_total = 2.0 * end_wall_area
        roof_area = 1.15 * math.pi * (width / 2.0) * length
        volume = 0.78 * width * height * length
        south_facing_area = (length * height * 0.64) * cos_fac + end_wall_area * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = end_wall_area * cos_fac + (length * height * 0.64) * sin_fac
        west_facing_area = east_facing_area

    # 10. Hyperbolic Paraboloid (Hypar Saddle)
    elif shape == "hyperbolic_paraboloid":
        floor_area = length * width
        wall_area_total = 2.0 * (length + width) * (height * 0.5)
        roof_area = 1.25 * length * width  # Saddle curvature expansion
        volume = length * width * (height * 0.65)
        south_facing_area = (length * height * 0.5) * cos_fac + (width * height * 0.5) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = (width * height * 0.5) * cos_fac + (length * height * 0.5) * sin_fac
        west_facing_area = east_facing_area

    # 11. Torus Inflatable Extreme-Altitude Pod
    elif shape == "torus_inflatable":
        r_major = (min(length, width) / 2.0) * 0.85
        r_minor = height * 0.45
        floor_area = math.pi * ((r_major + r_minor) ** 2 - max(0.1, r_major - r_minor) ** 2) * 0.7
        total_surface = 4.0 * (math.pi ** 2) * r_major * r_minor * 0.6
        wall_area_total = total_surface * 0.45
        roof_area = total_surface * 0.55
        volume = 2.0 * (math.pi ** 2) * r_major * (r_minor ** 2) * 0.65
        south_facing_area = (2.0 * r_major * height * 0.5) * cos_fac + (2.0 * r_major * height * 0.5) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = south_facing_area
        west_facing_area = south_facing_area

    # 12. Geodesic Dome (3V Icosahedron)
    elif shape == "geodesic_dome":
        r = min(length, width) / 2.0
        floor_area = math.pi * (r ** 2)
        dome_surface = 2.0 * math.pi * (r ** 2) * (height / max(0.1, r))
        wall_area_total = dome_surface * 0.35
        roof_area = dome_surface * 0.65
        volume = (2.0 / 3.0) * math.pi * (r ** 2) * height
        projected = (2.0 * r) * height * 0.5
        south_facing_area = projected * cos_fac + projected * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = south_facing_area
        west_facing_area = south_facing_area

    # 13. Igloo Catenary Dome
    elif shape == "igloo_catenary":
        r = min(length, width) / 2.0
        floor_area = math.pi * (r ** 2)
        # Catenary parabolic dome surface
        dome_surface = math.pi * r * math.sqrt(r ** 2 + 4.0 * (height ** 2))
        wall_area_total = dome_surface * 0.4
        roof_area = dome_surface * 0.6
        volume = 0.5 * math.pi * (r ** 2) * height
        projected = (2.0 * r) * height * 0.5
        south_facing_area = projected * cos_fac + projected * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = south_facing_area
        west_facing_area = south_facing_area

    # 14. Pyramidal 4-Sided Roof
    elif shape == "pyramidal":
        floor_area = length * width
        slant_l = math.sqrt((width / 2.0) ** 2 + height ** 2)
        slant_w = math.sqrt((length / 2.0) ** 2 + height ** 2)
        wall_area_total = 0.0  # Full ground-to-apex pyramid
        roof_area = 2.0 * (0.5 * length * slant_l) + 2.0 * (0.5 * width * slant_w)
        volume = (1.0 / 3.0) * length * width * height
        # Vertical projected facade elevation area for fenestration
        south_facing_area = (0.5 * length * height) * cos_fac + (0.5 * width * height) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = (0.5 * width * height) * cos_fac + (0.5 * length * height) * sin_fac
        west_facing_area = east_facing_area

    # 15. Conical Alpine Teepee
    elif shape == "conical_teepee":
        r = min(length, width) / 2.0
        floor_area = math.pi * (r ** 2)
        slant_height = math.sqrt(r ** 2 + height ** 2)
        wall_area_total = 0.0
        roof_area = math.pi * r * slant_height
        volume = (1.0 / 3.0) * math.pi * (r ** 2) * height
        projected = r * height * 0.5
        south_facing_area = projected * cos_fac + projected * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = south_facing_area
        west_facing_area = south_facing_area

    # 16. A-Frame Steep Triangular Prism
    elif shape == "aframe":
        slope_length = math.sqrt((width / 2.0) ** 2 + height ** 2)
        floor_area = length * width
        end_gable_area = 0.5 * width * height
        wall_area_total = 2.0 * end_gable_area
        roof_area = 2.0 * (slope_length * length)
        volume = (0.5 * width * height) * length
        south_facing_area = (length * height * 0.5) * cos_fac + end_gable_area * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = end_gable_area * cos_fac + (length * height * 0.5) * sin_fac
        west_facing_area = east_facing_area

    # 17. Hexagonal Nomadic Yurt
    elif shape == "hexagonal_yurt":
        r = min(length, width) / 2.0
        side = r
        floor_area = (3.0 * math.sqrt(3) / 2.0) * (side ** 2)
        wall_h = height * 0.6
        cone_h = height - wall_h
        wall_area_total = 6.0 * side * wall_h
        roof_slant = math.sqrt((side * math.sqrt(3) / 2.0) ** 2 + cone_h ** 2)
        roof_area = 6.0 * (0.5 * side * roof_slant)
        volume = (floor_area * wall_h) + (1.0 / 3.0 * floor_area * cone_h)
        proj_w = 2.0 * r
        south_facing_area = (proj_w * wall_h) * cos_fac + (proj_w * wall_h) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = south_facing_area
        west_facing_area = south_facing_area

    # 18. Octagonal High-Wind Defense Pod
    elif shape == "octagonal_pod":
        r = min(length, width) / 2.0
        side = 2.0 * r * (math.sqrt(2) - 1.0)
        floor_area = 2.0 * (1.0 + math.sqrt(2)) * (side ** 2)
        wall_h = height * 0.65
        cap_h = height - wall_h
        wall_area_total = 8.0 * side * wall_h
        roof_area = 8.0 * (0.5 * side * math.sqrt(r ** 2 + cap_h ** 2))
        volume = (floor_area * wall_h) + (0.5 * floor_area * cap_h)
        proj_w = 2.0 * r
        south_facing_area = (proj_w * wall_h) * cos_fac + (proj_w * wall_h) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = south_facing_area
        west_facing_area = south_facing_area

    # 19. Diamond Faceted Stealth Shelter
    elif shape == "diamond_faceted":
        floor_area = length * width * 0.85
        wall_area_total = 2.0 * (length + width) * (height * 0.5)
        roof_area = 1.35 * length * width
        volume = length * width * height * 0.58
        south_facing_area = (length * height * 0.5) * cos_fac + (width * height * 0.5) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = (width * height * 0.5) * cos_fac + (length * height * 0.5) * sin_fac
        west_facing_area = east_facing_area

    # 20. Supersonic Aerodynamic Wedge
    elif shape == "wedge_supersonic":
        floor_area = length * width
        # Wedge ramps up from 0.25*h at north to h at south
        h_north = height * 0.25
        h_south = height
        wall_south = length * h_south
        wall_north = length * h_north
        wall_side = width * (h_north + h_south) / 2.0
        wall_area_total = wall_south + wall_north + 2.0 * wall_side
        roof_slope = math.sqrt(width ** 2 + (h_south - h_north) ** 2)
        roof_area = length * roof_slope
        volume = length * width * (h_north + h_south) / 2.0
        south_facing_area = wall_south * cos_fac + wall_side * sin_fac
        north_facing_area = wall_north * cos_fac + wall_side * sin_fac
        east_facing_area = wall_side * cos_fac + wall_south * sin_fac
        west_facing_area = east_facing_area

    # 21. Bifacial Solar Collector Shed
    elif shape == "bifacial_shed":
        floor_area = length * width
        eave_h = height * 0.5
        ridge_h = height
        wall_south_lower = length * eave_h
        wall_north_lower = length * eave_h
        wall_gables = 2.0 * (width * eave_h + 0.5 * width * (ridge_h - eave_h))
        wall_area_total = wall_south_lower + wall_north_lower + wall_gables
        roof_south = length * math.sqrt((width * 0.6) ** 2 + (ridge_h - eave_h) ** 2)
        roof_north = length * math.sqrt((width * 0.4) ** 2 + (ridge_h - eave_h) ** 2)
        roof_area = roof_south + roof_north
        volume = length * width * eave_h + 0.5 * width * (ridge_h - eave_h) * length
        south_facing_area = wall_south_lower * cos_fac + (wall_gables / 2.0) * sin_fac
        north_facing_area = (wall_north_lower + roof_north * 0.3) * cos_fac + (wall_gables / 2.0) * sin_fac
        east_facing_area = (wall_gables / 2.0) * cos_fac + wall_south_lower * sin_fac
        west_facing_area = east_facing_area

    # 22. Stilt Elevated Tropical Pod
    elif shape == "stilt_elevated":
        stilt_h = 1.2
        floor_area = length * width
        wall_area_total = 2.0 * (length + width) * height + (length * width) * 0.8  # Elevated floor exposure
        roof_area = 1.15 * length * width  # Overhanging shaded roof
        volume = length * width * height
        south_facing_area = (length * height) * cos_fac + (width * height) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = (width * height) * cos_fac + (length * height) * sin_fac
        west_facing_area = east_facing_area

    # 23. Subterranean Bermed Bunker
    elif shape == "bunker_bermed":
        floor_area = length * width
        # 3 sides earth-bermed (only south facade exposed)
        wall_area_total = (length * height) + 2.0 * (width * height * 0.3)
        roof_area = length * width  # Heavily insulated green/bermed roof
        volume = length * width * height
        south_facing_area = (length * height) * cos_fac + (width * height * 0.3) * sin_fac
        north_facing_area = 0.05 * length * height  # Underground
        east_facing_area = (width * height * 0.3) * cos_fac + (length * height) * sin_fac
        west_facing_area = east_facing_area

    # 24. Modular Hex Cluster (3-cell)
    elif shape == "modular_hex_cluster":
        r = min(length, width) / 3.0
        side = r
        cell_floor = (3.0 * math.sqrt(3) / 2.0) * (side ** 2)
        floor_area = 3.0 * cell_floor
        wall_area_total = 14.0 * side * height  # Outer boundary perimeter
        roof_area = floor_area * 1.05
        volume = floor_area * height
        proj_w = 3.5 * r
        south_facing_area = (proj_w * height) * cos_fac + (proj_w * height) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = south_facing_area
        west_facing_area = south_facing_area

    # 25. Deployable Origami Accordion
    elif shape == "origami_accordion":
        floor_area = length * width
        pleat_factor = 1.32  # Origami surface area multiplication
        wall_area_total = 2.0 * (length + width) * height * pleat_factor
        roof_area = length * width * pleat_factor
        volume = length * width * height * 0.88
        south_facing_area = (length * height * 1.1) * cos_fac + (width * height * 1.1) * sin_fac
        north_facing_area = south_facing_area
        east_facing_area = (width * height * 1.1) * cos_fac + (length * height * 1.1) * sin_fac
        west_facing_area = east_facing_area

    envelope_area = wall_area_total + roof_area
    av_ratio = envelope_area / max(volume, 0.1)

    return EnvelopeGeometry(
        shape=shape,
        length=length,
        width=width,
        height=height,
        floor_area=floor_area,
        wall_area_total=wall_area_total,
        roof_area=roof_area,
        south_facing_area=south_facing_area,
        north_facing_area=north_facing_area,
        east_facing_area=east_facing_area,
        west_facing_area=west_facing_area,
        envelope_area=envelope_area,
        volume=volume,
        av_ratio=av_ratio,
    )
