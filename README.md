# NASA Space Apps Challenge: Lunar Landing Site Navigator
### Autonomous 100m × 100m South Pole Candidate Exploration, Real LOLA Topography & JPL Horizons Ephemeris System

[![NASA Space Apps](https://img.shields.io/badge/NASA%20Space%20Apps-Challenge%20Solution-blue.svg)](https://www.spaceappschallenge.org/)
[![Strict Zero Mock Data](https://img.shields.io/badge/Compliance-Strict%20Zero--Mock%20Data-emerald.svg)](#strict-zero-mock-data-rule)
[![LOLA Science Team](https://img.shields.io/badge/Data-NASA%20LOLA%20PDS%20DEM-orange.svg)](https://pgda.gsfc.nasa.gov/products/78)
[![JPL Horizons](https://img.shields.io/badge/Ephemeris-NASA%20JPL%20Horizons%20REST-purple.svg)](https://ssd.jpl.nasa.gov/api/horizons.api)

---

## Overview

The **Lunar Landing Site Navigator** is a mission-grade aerospace software suite designed to autonomously evaluate and rank **100m × 100m candidate landing sites** across the lunar South Pole ($85^\circ\text{S}$ to $90^\circ\text{S}$). Built in strict compliance with the **Zero-Mock-Data Rule**, every single physical parameter—topographic elevation, surface slope, 360-degree obstacle horizon masks, apparent solar elevation, direct Earth radio-frequency (RF) line-of-sight, and solar irradiance—is computed mathematically from authentic **NASA Lunar Orbiter Laser Altimeter (LOLA) Digital Elevation Models (DEMs)** and the **NASA JPL Horizons REST API**.

---

## Strict Zero-Mock-Data Architecture

```
   ┌────────────────────────────────────────────────────────────────────────┐
   │                          DATA SOURCES (NASA)                           │
   └───────────────────┬────────────────────────────────┬───────────────────┘
                       │                                │
                       ▼                                ▼
       NASA Planetary Geodynamics (PGDA)       NASA JPL Horizons REST API
        LOLA South Pole GeoTIFFs (.tif)      (coord@301, QUANTITIES='4')
                       │                                │
                       ▼                                ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │       PART 1: PYTHON REAL-DATA INGESTION PIPELINE (/pipeline/)        │
    │                                                                       │
    │  • Reads real LOLA GeoTIFFs via rasterio / tifffile / numpy           │
    │  • Slices terrain into 100m x 100m candidate parcels                  │
    │  • Computes mean elevation relative to R_M = 1737.4 km                │
    │  • Computes max surface slope via finite-difference gradients         │
    │  • Raymarches 360° obstacle horizon mask up to 25 km with curvature:  │
    │    α(ψ) = max arctan2(z_terrain - z_site - (d² / 2 R_M), d)           │
    │  • Ingests 2,160 hourly ephemeris steps for Sun (10) & Earth (399)    │
    └───────────────────┬────────────────────────────────┬──────────────────┘
                        │                                │
                        ▼                                ▼
              src/data/lola_candidates_grid.json    src/data/ephemeris_*.json
                        │                                │
                        └───────────────┬────────────────┘
                                        │
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │        PART 2: REACT + TYPESCRIPT WEB APPLICATION (/src/)             │
    │                                                                       │
    │  • Timeline Scrubber: UTC epoch scrubbing with play/pause & speed     │
    │  • Mission Constraint Engine: CLPS (≤8°, ≥72h) vs Artemis (≤5°, ≥168h)│
    │  • Real NASA LROC / USGS WMTS Lunar Map with 100m scaled bounding box  │
    │  • Topocentric Sky & LOLA Horizon Radar (HTML5 Canvas projection)     │
    │  • Live NASA JPL Horizons Verification Client (CORS-proxied)          │
    │  • Scientific Telemetry HUD: Slope, Elev, Margins, Solar Irradiance   │
    └───────────────────────────────────────────────────────────────────────┘
```

---

## Mathematical Formulations

### 1. 100m × 100m Selenographic Bounding Box Scaling
On the lunar reference sphere ($R_M = 1,737,400\text{ m}$):
$$\Delta\text{lat} = \frac{100\text{ m}}{R_M} \times \frac{180^\circ}{\pi} \approx 0.00329806^\circ$$
$$\Delta\text{lon} = \frac{\Delta\text{lat}}{\cos(\text{lat})}$$
As latitude approaches $-90^\circ$ (South Pole), the longitudinal span increases according to spherical geometry, correctly preserving a physical 100-meter ground distance.

### 2. Surface Slope Angle Calculation
Slope angle $\beta$ across each 100m parcel is computed via finite-difference elevation gradients:
$$g_x = \frac{\partial z}{\partial x}, \quad g_y = \frac{\partial z}{\partial y}$$
$$\beta = \arctan\left(\sqrt{g_x^2 + g_y^2}\right) \times \frac{180^\circ}{\pi}$$
Parcels exceeding the mission threshold ($\beta > 8^\circ$ for CLPS or $\beta > 5^\circ$ for Artemis) are rejected due to lander tipping hazard.

### 3. 360-Degree Topographic Horizon Obstruction Mask
Surrounding crater rims (e.g. Shackleton, Faustini, Malapert) create dramatic elevation masks that cause Permanently Shadowed Regions (PSRs). Raymarching outward up to $25\text{ km}$ at $1^\circ$ azimuth increments:
$$\alpha(\psi) = \max_{0 < d \le 25\text{ km}} \arctan2\left(z_{\text{terrain}}(d, \psi) - z_{\text{site}} - \frac{d^2}{2 R_M}, d\right) \times \frac{180^\circ}{\pi}$$
where $-\frac{d^2}{2 R_M}$ mathematically compensates for the spherical curvature drop of the Moon.

### 4. Line-of-Sight & Solar Irradiance
- **Solar Line-of-Sight Margin:** $\Delta\theta_{\odot} = \theta_{\odot} - \alpha(\psi_{\odot})$
- **Earth RF Line-of-Sight Margin:** $\Delta\theta_{\oplus} = \theta_{\oplus} - \alpha(\psi_{\oplus})$
- **Effective Solar Irradiance:**
  $$I_{\text{eff}} = \begin{cases} 1361.0 \times \sin(\Delta\theta_{\odot})\text{ W/m}^2 & \text{if } \Delta\theta_{\odot} > 0 \\ 0.0\text{ W/m}^2 & \text{if occulted (shadow)} \end{cases}$$

---

## Repository Structure

```
d:\NASA Space app\
├── pipeline\                                 # Part 1: Python Pipeline
│   ├── fetch_nasa_data.py                    # JPL Horizons fetcher & LOLA DEM processor
│   ├── requirements.txt                      # Python dependencies (requests, numpy, rasterio, scipy)
│   ├── DATA_SETUP.md                         # NASA data acquisition guide
│   └── raw_dem\                              # Drop LOLA GeoTIFFs (.tif) here
│       └── LOLA_SouthPole_sample.tif         # Authentic USGS LOLA South Pole GeoTIFF slice
├── src\                                      # Part 2: Frontend Web Application
│   ├── data\                                 # Authentic NASA Datasets
│   │   ├── ephemeris_sun.json                # 2,160 steps from NASA JPL Horizons (Target 10)
│   │   ├── ephemeris_earth.json              # 2,160 steps from NASA JPL Horizons (Target 399)
│   │   └── lola_candidates_grid.json         # 150 candidate parcels from real LOLA DEM
│   ├── components\
│   │   ├── Header.tsx                        # NASA Space Apps branding & telemetry clock
│   │   ├── MissionControls.tsx               # CLPS vs Artemis vs Custom constraints
│   │   ├── TimelineScrubber.tsx              # Interactive date/time scrubber & animation
│   │   ├── LunarMap.tsx                      # Leaflet map with NASA LROC WAC & USGS layers
│   │   ├── TopocentricRadar.tsx              # 360° LOLA Horizon & Sky projection canvas
│   │   ├── TelemetryPanel.tsx                # Aerospace HUD telemetry display
│   │   ├── CandidateList.tsx                 # Ranked candidate parcels table
│   │   ├── HorizonsVerifier.tsx              # Live NASA JPL Horizons query drawer
│   │   ├── DataIngestionModal.tsx            # Setup guide and local pipeline modal
│   │   └── Footer.tsx                        # Official NASA scientific attribution
│   ├── services\
│   │   ├── astronomicalEngine.ts             # Ephemeris interpolation & IAU analytical models
│   │   ├── horizonsApi.ts                    # Live JPL Horizons REST client & proxy
│   │   └── siteSelectionEngine.ts            # Autonomous multi-objective site selection
│   ├── types\
│   │   └── lunar.ts                          # Comprehensive TypeScript interfaces
│   ├── App.tsx                               # Master application container
│   ├── main.tsx                              # React DOM mount point
│   └── index.css                             # Tailwind CSS & custom animations
├── index.html                                # Web shell with Leaflet and Google Fonts
├── vite.config.ts                            # Vite configuration with JPL Horizons proxy
├── tailwind.config.js                        # Lunar mission color theme
├── tsconfig.json                             # Strict TypeScript configuration
└── package.json                              # Project manifest
```

---

## Quickstart Guide

### 1. Running the Python Pipeline (Part 1)
```bash
# Install Python scientific libraries
pip install -r pipeline/requirements.txt

# Run the ingestion pipeline
python pipeline/fetch_nasa_data.py
```
*Note: The pipeline automatically discovers any `.tif` placed in `pipeline/raw_dem/`, queries the NASA JPL Horizons REST API, and outputs structured JSON datasets into `src/data/`.*

### 2. Running the Web Application (Part 2)
```bash
# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scientific Attribution

This application integrates authentic scientific datasets from:
1. **NASA Jet Propulsion Laboratory (JPL) Horizons Ephemeris System:** [https://ssd.jpl.nasa.gov/horizons/](https://ssd.jpl.nasa.gov/horizons/)
2. **Lunar Reconnaissance Orbiter Camera (LROC) Science Operations Center:** [https://www.lroc.asu.edu/](https://www.lroc.asu.edu/)
3. **NASA Lunar Orbiter Laser Altimeter (LOLA) Science Team & Planetary Geodynamics Laboratory (PGDA):** [https://pgda.gsfc.nasa.gov/products/78](https://pgda.gsfc.nasa.gov/products/78)
4. **USGS Astrogeology Planetary GIS Server:** [https://planetarymaps.usgs.gov/](https://planetarymaps.usgs.gov/)
