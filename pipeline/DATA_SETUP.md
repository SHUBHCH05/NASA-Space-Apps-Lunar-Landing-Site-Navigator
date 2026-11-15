# NASA LOLA DEM & JPL Horizons Data Setup Guide

This guide describes how to populate the Lunar Landing Site Navigator with authentic NASA Digital Elevation Models (DEMs) and JPL Horizons ephemerides.

---

## 1. NASA LOLA GeoTIFF Elevation Files

The pipeline accepts GeoTIFF files (`.tif`) of the lunar South Pole (85°S to 90°S).

### Official NASA Sources:

1. **NASA Planetary Geodynamics Laboratory (PGDA):**
   - **URL:** [https://pgda.gsfc.nasa.gov/products/78](https://pgda.gsfc.nasa.gov/products/78)
   - **Recommended Products:**
     - `LDEM_80S_20M.tif` — LOLA South Pole Elevation Model from 80°S to 90°S (20 meters/pixel, Polar Stereographic projection).
     - `LDEM_85S_10M.tif` — High-resolution 10m/pixel LOLA DEM for the 85°S–90°S circumpolar zone.
     - `LDEM_875S_5M.tif` — 5m/pixel DEM covering candidate Artemis III landing zones.

2. **LROC QuickMap (Arizona State University & LOLA Science Team):**
   - **URL:** [https://quickmap.lroc.im-ldi.com](https://quickmap.lroc.im-ldi.com)
   - Navigate to the Lunar South Pole (Projection: Polar Stereographic).
   - Under Layers, enable **LOLA Elevation Model (LDEM)**.
   - Use the **Export / Download Tool** (Bounding Box) to extract a GeoTIFF covering candidate landing regions:
     - **Site 04 / Shackleton Crater Rim:** `Site04_Shackleton_5mpp.tif` (Coordinates: 89.9°S, 0.0°E)
     - **Connecting Ridge:** Between Shackleton and de Gerlache (89.5°S, 222.0°E)
     - **Malapert Mountain:** (85.99°S, 2.93°E)
     - **Nobile Rim 1 & 2:** (85.2°S, 37.8°E)
     - **Amundsen Rim:** (84.4°S, 85.6°E)
     - **Faustini Rim:** (87.1°S, 77.0°E)
     - **Haworth Crater Rim:** (87.4°S, 355.0°E)

### Placement:
Place any downloaded `.tif` files into the directory:
```
pipeline/raw_dem/
```
(e.g., `pipeline/raw_dem/Site04_Shackleton_5mpp.tif` or `pipeline/raw_dem/LDEM_80S_20M.tif`).

---

## 2. Python Environment Setup

Install the required Python scientific libraries:
```bash
pip install -r pipeline/requirements.txt
```

Libraries used:
- `requests`: Direct HTTP queries to the NASA JPL Horizons REST API.
- `numpy`: High-performance multi-dimensional array operations for terrain matrices.
- `rasterio`: Geospatial GDAL/GeoTIFF raster reader and metadata parser.
- `scipy`: Spatial interpolation and gradient filters.

---

## 3. Running the Ingestion Pipeline

Execute the pipeline runner from the root directory:
```bash
python pipeline/fetch_nasa_data.py
```

Optional CLI flags:
```bash
python pipeline/fetch_nasa_data.py --dem pipeline/raw_dem/Site04_Shackleton_5mpp.tif --start 2026-01-01 --stop 2026-12-31 --step 1h
```

### What the Pipeline Does:

1. **JPL Horizons Ephemeris Ingestion:**
   - Queries `https://ssd.jpl.nasa.gov/api/horizons.api`
   - Sets Lunar body-fixed coordinates: `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, `SITE_COORD='0,-89.9,0'`
   - Fetches Apparent Azimuth and Elevation (`QUANTITIES='4'`) for:
     - Target `10` (Sun)
     - Target `399` (Earth)
   - Parses the `$$SOE` ... `$$EOE` tabular block.
   - Saves:
     - `src/data/ephemeris_sun.json`
     - `src/data/ephemeris_earth.json`

2. **LOLA DEM Topography & Horizon Obstruction Mask Computation:**
   - Reads the LOLA GeoTIFF and extracts pixel resolution, affine transform, and NoData masks.
   - Slices the terrain into an indexed grid of **100m × 100m candidate parcels**.
   - For each parcel:
     - **Mean Elevation ($z_{\text{site}}$):** Computed in meters relative to the lunar reference sphere ($R_M = 1737.4\text{ km}$).
     - **Maximum Surface Slope ($\beta$):** Computed using central difference gradients:
       $$\beta = \arctan\left(\sqrt{\left(\frac{\partial z}{\partial x}\right)^2 + \left(\frac{\partial z}{\partial y}\right)^2}\right) \times \frac{180}{\pi}$$
     - **360-Degree Topographic Horizon Mask ($\alpha(\psi)$):** Raymarches outward up to $25\text{ km}$ at $1^\circ$ azimuth increments (0° to 359°):
       $$\alpha(\psi) = \max_{0 < d \le 25\text{ km}} \arctan2\left(z_{\text{terrain}}(d, \psi) - z_{\text{site}} - \frac{d^2}{2 R_M}, d\right) \times \frac{180}{\pi}$$
       where $-\frac{d^2}{2 R_M}$ mathematically compensates for the spherical curvature of the Moon.
   - Saves:
     - `src/data/lola_candidates_grid.json`

---

## 4. Frontend Integration

Once the files are generated in `src/data/`, start the React application:
```bash
npm run dev
```
The application will automatically detect the datasets, render the 100m × 100m candidate parcels on the real NASA LROC lunar map, evaluate solar/Earth line-of-sight against the LOLA horizon masks, and rank landing sites according to mission criteria (CLPS vs. Artemis).
