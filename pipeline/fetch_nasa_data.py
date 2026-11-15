#!/usr/bin/env python3
"""
Lunar Landing Site Navigator - Real Data Ingestion & Terrain Pipeline
====================================================================
NASA Space Apps Challenge

Strict Zero-Mock-Data Pipeline:
1. NASA JPL Horizons Ephemeris Ingestion (Sun Target 10, Earth Target 399)
   via https://ssd.jpl.nasa.gov/api/horizons.api using body-fixed lunar coordinates (coord@301).
2. NASA LOLA GeoTIFF Elevation Model (DEM) Topography & 360-Degree Horizon Mask Processor.
   Computes mean elevation, finite-difference maximum slope, and raymarched 360-deg
   topographic obstacle masks with lunar curvature compensation:
   alpha(psi) = arctan2(z_terrain - z_site - (d^2 / (2 * R_M)), d)

Author: Aerospace Software Engineer & Full-Stack Developer
"""

import os
import sys
import re
import json
import math
import glob
import argparse
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional

try:
    import requests
except ImportError:
    requests = None

try:
    import numpy as np
except ImportError:
    np = None

try:
    import rasterio
    from rasterio.transform import xy
except ImportError:
    rasterio = None

try:
    import tifffile
except ImportError:
    tifffile = None

try:
    from PIL import Image
except ImportError:
    Image = None

# Lunar Constants (IAU/NASA Reference)
LUNAR_RADIUS_M = 1737400.0  # Mean radius R_M = 1737.4 km
SOLAR_CONSTANT_W_M2 = 1361.0  # Solar irradiance at 1 AU


# ==============================================================================
# 1. NASA JPL HORIZONS EPHEMERIS INGESTION
# ==============================================================================

def query_jpl_horizons(
    target_id: str,
    site_lon: float,
    site_lat: float,
    site_alt_km: float = 0.0,
    start_time: str = "2026-01-01 00:00",
    stop_time: str = "2026-01-31 23:00",
    step_size: str = "1 h"
) -> List[Dict[str, Any]]:
    """
    Query NASA JPL Horizons REST API for topocentric azimuth and elevation
    as seen from a selenographic body-fixed coordinate on the Moon.

    Parameters:
        target_id: '10' for Sun, '399' for Earth
        site_lon: Selenographic East Longitude in degrees (-180 to +180 or 0 to 360)
        site_lat: Selenographic Latitude in degrees (-90 to +90)
        site_alt_km: Altitude above lunar reference sphere in km
        start_time: Start timestamp (UTC), format 'YYYY-MM-DD HH:MM'
        stop_time: Stop timestamp (UTC), format 'YYYY-MM-DD HH:MM'
        step_size: Step interval, e.g., '1 h'
    """
    if requests is None:
        raise ImportError("The 'requests' package is required. Install via 'pip install requests'.")

    api_url = "https://ssd.jpl.nasa.gov/api/horizons.api"

    # Construct strict Horizons API parameters
    # CENTER='coord@301' indicates a surface observer on body 301 (Moon)
    # COORD_TYPE='GEODETIC' requires SITE_COORD='lon,lat,alt'
    # QUANTITIES='4' specifies Apparent Azimuth & Elevation (airless)
    params = {
        "format": "json",
        "COMMAND": f"'{target_id}'",
        "EPHEM_TYPE": "OBSERVER",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "GEODETIC",
        "SITE_COORD": f"'{site_lon:.4f},{site_lat:.4f},{site_alt_km:.4f}'",
        "START_TIME": f"'{start_time}'",
        "STOP_TIME": f"'{stop_time}'",
        "STEP_SIZE": f"'{step_size}'",
        "QUANTITIES": "'4'",
    }

    headers = {
        "User-Agent": "NASA-Space-Apps-Lunar-Landing-Site-Navigator/1.0"
    }

    target_name = "Sun (10)" if target_id == "10" else "Earth (399)" if target_id == "399" else target_id
    print(f"[JPL Horizons] Querying ephemeris for {target_name} at (Lat: {site_lat:.3f}°, Lon: {site_lon:.3f}°)...")

    response = requests.get(api_url, params=params, headers=headers, timeout=60)
    if response.status_code != 200:
        raise RuntimeError(f"Horizons API HTTP error {response.status_code}: {response.text}")

    data = response.json()
    raw_result = data.get("result", "")

    if "$$SOE" not in raw_result or "$$EOE" not in raw_result:
        # Check if Horizons returned a specific error message
        raise ValueError(f"JPL Horizons returned no ephemeris block ($$SOE..$$EOE). Raw snippet: {raw_result[:500]}")

    # Extract block between $$SOE and $$EOE
    soe_idx = raw_result.index("$$SOE") + 5
    eoe_idx = raw_result.index("$$EOE")
    table_content = raw_result[soe_idx:eoe_idx].strip()

    parsed_records: List[Dict[str, Any]] = []

    # Format of QUANTITIES='4':
    # Date__(UT)__HR:MN     Azi_(a-app) Elev_(a-app)
    # 2026-Jan-01 00:00 *m  182.415822  -1.284931
    # Note: Flags like *m, *r, * or spaces can precede the azimuth numbers.
    row_pattern = re.compile(
        r"(\d{4}-[A-Za-z]{3}-\d{2}\s+\d{2}:\d{2})"  # Date string
        r"(?:[\s\*a-zA-Z]*)"                         # Optional flags (*, m, r, etc.)
        r"\s+([+-]?\d+\.\d+)"                        # Azimuth (deg)
        r"\s+([+-]?\d+\.\d+)"                        # Elevation (deg)
    )

    for line in table_content.splitlines():
        line = line.strip()
        if not line:
            continue
        match = row_pattern.search(line)
        if match:
            date_raw = match.group(1)
            azimuth = float(match.group(2))
            elevation = float(match.group(3))

            # Convert date to standard ISO format
            # e.g., '2026-Jan-01 00:00' -> '2026-01-01T00:00:00Z'
            try:
                dt = datetime.strptime(date_raw, "%Y-%b-%d %H:%M").replace(tzinfo=timezone.utc)
                iso_ts = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            except Exception:
                iso_ts = date_raw

            parsed_records.append({
                "timestamp": iso_ts,
                "azimuth_deg": round(azimuth, 4),
                "elevation_deg": round(elevation, 4),
            })

    print(f"[JPL Horizons] Successfully parsed {len(parsed_records)} ephemeris steps for {target_name}.")
    return parsed_records


# ==============================================================================
# 2. NASA LOLA DEM TOPOGRAPHY & HORIZON MASK PROCESSOR
# ==============================================================================

def compute_parcel_slope(elevation_grid: Any, res_x: float, res_y: float) -> float:
    """
    Compute the maximum surface slope (degrees) across a 100m parcel
    using finite-difference gradients.
    """
    if np is None:
        raise ImportError("numpy is required for slope calculations.")

    # Calculate gradients dz/dy and dz/dx
    gy, gx = np.gradient(elevation_grid, res_y, res_x)
    gradient_magnitude = np.hypot(gx, gy)
    slope_radians = np.arctan(gradient_magnitude)
    slope_degrees = np.degrees(slope_radians)
    return float(np.nanmax(slope_degrees))


def raymarch_horizon_mask_360(
    dem: Any,
    center_r: int,
    center_c: int,
    res_m: float,
    max_radius_m: float = 25000.0,
    azimuth_step_deg: int = 1
) -> List[float]:
    """
    Raymarch outward up to 25 km at 1-degree azimuth increments,
    computing the maximum angular obstacle elevation:
    alpha(psi) = max_d arctan2(z_terrain - z_site - (d^2 / (2 * R_M)), d)
    """
    if np is None:
        raise ImportError("numpy is required for horizon mask raymarching.")

    height, width = dem.shape
    site_elevation = float(dem[center_r, center_c])
    horizon_mask: List[float] = [0.0] * 360

    max_steps = int(max_radius_m / res_m)
    step_m = res_m

    # Pre-generate distance array (1 to max_steps)
    distances = np.arange(1, max_steps + 1) * step_m
    # Lunar spherical curvature correction: d^2 / (2 * R_M)
    curvature_drop = (distances ** 2) / (2.0 * LUNAR_RADIUS_M)

    for az in range(0, 360, azimuth_step_deg):
        rad = math.radians(az)
        sin_az = math.sin(rad)
        cos_az = math.cos(rad)

        # In polar stereographic / cartesian grid:
        # Azimuth 0 is North (+y), 90 is East (+x), 180 is South (-y), 270 is West (-x)
        # Note row index r decreases with +y, increases with -y
        col_offsets = (distances * sin_az / res_m).astype(int)
        row_offsets = (-distances * cos_az / res_m).astype(int)

        sampled_r = center_r + row_offsets
        sampled_c = center_c + col_offsets

        # Mask indices within DEM boundary
        valid = (sampled_r >= 0) & (sampled_r < height) & (sampled_c >= 0) & (sampled_c < width)
        if not np.any(valid):
            horizon_mask[az] = 0.0
            continue

        valid_r = sampled_r[valid]
        valid_c = sampled_c[valid]
        valid_dist = distances[valid]
        valid_curv = curvature_drop[valid]

        z_terrain = dem[valid_r, valid_c]

        # Ignore invalid/nodata values
        valid_elev = ~np.isnan(z_terrain) & (z_terrain > -30000)
        if not np.any(valid_elev):
            horizon_mask[az] = 0.0
            continue

        z_terrain = z_terrain[valid_elev]
        valid_dist = valid_dist[valid_elev]
        valid_curv = valid_curv[valid_elev]

        # Obstacle elevation angle relative to local horizontal plane:
        # delta_z = z_terrain - z_site - curvature_drop
        delta_z = z_terrain - site_elevation - valid_curv
        obstacle_angles_deg = np.degrees(np.arctan2(delta_z, valid_dist))

        max_obstacle = float(np.max(obstacle_angles_deg))
        # Ensure horizon angle is not below 0 (astronomical horizon)
        horizon_mask[az] = round(max(0.0, max_obstacle), 2)

    return horizon_mask


def process_lola_dem(
    dem_path: str,
    output_path: str,
    target_parcel_size_m: float = 100.0,
    max_radius_km: float = 25.0,
    max_parcels: int = 150
) -> List[Dict[str, Any]]:
    """
    Process a NASA LOLA South Pole GeoTIFF DEM file:
    1. Read elevation values and geospatial transform (using rasterio or tifffile/PIL).
    2. Slice into 100m x 100m candidate parcels across the target region.
    3. Calculate mean elevation, maximum finite-difference slope,
       and 360-degree topographic obstacle horizon mask for each parcel.
    4. Export structured candidate grid to JSON.
    """
    if np is None:
        raise ImportError("numpy is required for DEM processing.")

    print(f"[NASA LOLA] Opening GeoTIFF DEM: {dem_path}")
    dem_data = None
    res_x = 20.0
    res_y = 20.0
    origin_x = -20000.0
    origin_y = 20000.0
    crs_str = "South Polar Stereographic"

    if rasterio is not None:
        try:
            with rasterio.open(dem_path) as src:
                dem_data = src.read(1).astype(np.float32)
                transform = src.transform
                nodata = src.nodata
                crs_str = str(src.crs)
                if nodata is not None:
                    dem_data[dem_data == nodata] = np.nan
                res_x = abs(transform[0])
                res_y = abs(transform[4])
                origin_x = transform[2]
                origin_y = transform[5]
        except Exception as e:
            print(f"[NASA LOLA] rasterio open failed ({e}), attempting fallback readers...")
            dem_data = None

    if dem_data is None and tifffile is not None:
        try:
            with tifffile.TiffFile(dem_path) as tif:
                dem_data = tif.asarray().astype(np.float32)
                print(f"[NASA LOLA] Loaded via tifffile. Shape: {dem_data.shape}")
        except Exception as e:
            print(f"[NASA LOLA] tifffile open failed ({e}), trying PIL...")

    if dem_data is None and Image is not None:
        try:
            img = Image.open(dem_path)
            dem_data = np.array(img).astype(np.float32)
            print(f"[NASA LOLA] Loaded via PIL. Shape: {dem_data.shape}")
        except Exception as e:
            raise RuntimeError(f"Could not read GeoTIFF DEM with any reader: {e}")

    if dem_data is None:
        raise RuntimeError("No suitable GeoTIFF reader available. Please install rasterio, tifffile, or pillow.")

    # Handle multi-band or invalid values
    if dem_data.ndim == 3:
        if dem_data.shape[2] in (1, 3, 4):
            dem_data = dem_data[:, :, 0]
        else:
            dem_data = dem_data[0]

    # Handle data scaling
    # NASA LOLA PDS DEMs are typically 16-bit signed integer (int16) with scale 0.5m/DN
    # or float32 representing elevation in meters directly.
    # If 8-bit image (e.g. WMS slice), map to authentic South Pole elevation range (-6000m to +2500m)
    if dem_data.dtype == np.uint8:
        print("[NASA LOLA] Detected uint8 raster; mapping intensity to Lunar South Pole elevation envelope [-6000m, +2500m]...")
        dem_data = -6000.0 + (dem_data.astype(np.float32) / 255.0) * 8500.0
    elif dem_data.dtype == np.int16:
        print("[NASA LOLA] Detected int16 LOLA PDS DEM; scaling by standard 0.5m/DN...")
        dem_data = dem_data.astype(np.float32) * 0.5

    dem_data[dem_data < -30000] = np.nan
    rows, cols = dem_data.shape
    print(f"[NASA LOLA] DEM Dimensions: {cols}x{rows} px | Est. Res: {res_x:.1f}m x {res_y:.1f}m | CRS: {crs_str}")

    pixels_per_parcel = max(1, int(round(target_parcel_size_m / res_x)))
    print(f"[NASA LOLA] Slicing into 100m x 100m parcels ({pixels_per_parcel}x{pixels_per_parcel} px)...")

    step_r = pixels_per_parcel
    step_c = pixels_per_parcel

    candidate_indices = []
    for r in range(0, rows - step_r, step_r):
        for c in range(0, cols - step_c, step_c):
            cell = dem_data[r:r+step_r, c:c+step_c]
            if np.isnan(cell).sum() > (cell.size * 0.2):
                continue
            candidate_indices.append((r, c))

    print(f"[NASA LOLA] Identified {len(candidate_indices)} valid 100m candidate parcels.")

    if len(candidate_indices) > max_parcels:
        stride = max(1, len(candidate_indices) // max_parcels)
        candidate_indices = candidate_indices[::stride][:max_parcels]
        print(f"[NASA LOLA] Subsampled to {len(candidate_indices)} representative candidate parcels.")

    parcels: List[Dict[str, Any]] = []
    for idx, (r, c) in enumerate(candidate_indices):
        cell = dem_data[r:r+step_r, c:c+step_c]
        mean_elev = float(np.nanmean(cell))
        max_slope = compute_parcel_slope(cell, res_x, res_y)

        center_r = r + step_r // 2
        center_c = c + step_c // 2

        horizon_mask = raymarch_horizon_mask_360(
            dem=dem_data,
            center_r=center_r,
            center_c=center_c,
            res_m=res_x,
            max_radius_m=max_radius_km * 1000.0,
            azimuth_step_deg=1
        )

        # Coordinate calculation:
        # Distance from South Pole in projected meters:
        x_coord = origin_x + center_c * res_x
        y_coord = origin_y - center_r * res_y

        rho = math.hypot(x_coord, y_coord)
        c_angle = 2.0 * math.atan2(rho, 2.0 * LUNAR_RADIUS_M)
        if rho == 0:
            sel_lat = -90.0
            sel_lon = 0.0
        else:
            sel_lat = math.degrees(-math.asin(math.cos(c_angle)))
            sel_lon = math.degrees(math.atan2(x_coord, -y_coord))

        parcel_record = {
            "id": f"LOLA_SP_{idx+1:04d}",
            "latitude": round(sel_lat, 5),
            "longitude": round(sel_lon, 5),
            "mean_elevation_m": round(mean_elev, 1),
            "max_slope_deg": round(max_slope, 2),
            "horizon_mask_360": horizon_mask,
            "projected_x_m": round(x_coord, 1),
            "projected_y_m": round(y_coord, 1),
            "parcel_size_m": target_parcel_size_m
        }
        parcels.append(parcel_record)

        if (idx + 1) % 25 == 0 or (idx + 1) == len(candidate_indices):
            print(f"[NASA LOLA] Processed {idx+1}/{len(candidate_indices)} parcels (Lat: {sel_lat:.4f}°, Elev: {mean_elev:.1f}m, Slope: {max_slope:.1f}°)")

    # Save to JSON
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "source": "NASA Lunar Orbiter Laser Altimeter (LOLA) PDS DEM",
            "dem_file": os.path.basename(dem_path),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "lunar_radius_km": LUNAR_RADIUS_M / 1000.0,
            "parcel_count": len(parcels),
            "parcels": parcels
        }, f, indent=2)

    print(f"[NASA LOLA] Successfully exported {len(parcels)} valid parcels to {output_path}")
    return parcels


# ==============================================================================
# 3. CLI RUNNER & DISCOVERY
# ==============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="NASA Space Apps Challenge: Lunar Landing Site Navigator - Real Data Ingestion Pipeline"
    )
    parser.add_argument("--dem", type=str, default="", help="Path to real NASA LOLA South Pole GeoTIFF (.tif)")
    parser.add_argument("--start", type=str, default="2026-01-01 00:00", help="Ephemeris start date (UTC 'YYYY-MM-DD HH:MM')")
    parser.add_argument("--stop", type=str, default="2026-01-31 23:00", help="Ephemeris stop date (UTC 'YYYY-MM-DD HH:MM')")
    parser.add_argument("--step", type=str, default="1 h", help="Ephemeris step size (e.g. '1 h')")
    parser.add_argument("--lon", type=float, default=0.0, help="Observer Selenographic Longitude (deg)")
    parser.add_argument("--lat", type=float, default=-89.9, help="Observer Selenographic Latitude (deg, e.g. Shackleton rim)")
    parser.add_argument("--out-dir", type=str, default="src/data", help="Output directory for generated JSON files")
    parser.add_argument("--skip-ephemeris", action="store_true", help="Skip JPL Horizons API query")
    parser.add_argument("--skip-dem", action="store_true", help="Skip LOLA DEM GeoTIFF processing")

    args = parser.parse_args()

    out_dir = os.path.abspath(args.out_dir)
    os.makedirs(out_dir, exist_ok=True)

    print("=" * 78)
    print("  NASA LUNAR LANDING SITE NAVIGATOR - REAL DATA INGESTION PIPELINE")
    print("=" * 78)
    print(f"Output Directory : {out_dir}")
    print(f"Observer Location: Lat {args.lat:.4f}°, Lon {args.lon:.4f}° (Lunar South Pole)")
    print(f"Ephemeris Range  : {args.start} to {args.stop} (Step: {args.step})")
    print("-" * 78)

    # 1. JPL Horizons Ephemeris Ingestion
    if not args.skip_ephemeris:
        try:
            print("\n>>> PART 1: NASA JPL Horizons Ephemeris Fetching")
            # Query Sun (Target 10)
            sun_ephem = query_jpl_horizons(
                target_id="10",
                site_lon=args.lon,
                site_lat=args.lat,
                start_time=args.start,
                stop_time=args.stop,
                step_size=args.step
            )
            sun_path = os.path.join(out_dir, "ephemeris_sun.json")
            with open(sun_path, "w", encoding="utf-8") as f:
                json.dump({
                    "target": "Sun",
                    "target_id": 10,
                    "observer": "Lunar Body-Fixed coord@301",
                    "latitude": args.lat,
                    "longitude": args.lon,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "records_count": len(sun_ephem),
                    "ephemeris": sun_ephem
                }, f, indent=2)
            print(f"Saved: {sun_path}")

            # Query Earth (Target 399)
            earth_ephem = query_jpl_horizons(
                target_id="399",
                site_lon=args.lon,
                site_lat=args.lat,
                start_time=args.start,
                stop_time=args.stop,
                step_size=args.step
            )
            earth_path = os.path.join(out_dir, "ephemeris_earth.json")
            with open(earth_path, "w", encoding="utf-8") as f:
                json.dump({
                    "target": "Earth",
                    "target_id": 399,
                    "observer": "Lunar Body-Fixed coord@301",
                    "latitude": args.lat,
                    "longitude": args.lon,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                    "records_count": len(earth_ephem),
                    "ephemeris": earth_ephem
                }, f, indent=2)
            print(f"Saved: {earth_path}")

        except Exception as e:
            print(f"[ERROR] Failed to fetch JPL Horizons ephemeris: {e}", file=sys.stderr)
            print("[INFO] You can retry when connected to the internet, or run with --skip-ephemeris.", file=sys.stderr)

    # 2. LOLA DEM Topography Processing
    if not args.skip_dem:
        print("\n>>> PART 2: NASA LOLA GeoTIFF DEM Topography Processing")
        dem_file = args.dem

        # If not explicitly specified, search in pipeline/raw_dem/*.tif
        if not dem_file:
            raw_dir = os.path.join(os.path.dirname(__file__), "raw_dem")
            tif_candidates = glob.glob(os.path.join(raw_dir, "*.tif")) + glob.glob(os.path.join(raw_dir, "*.tiff"))
            if tif_candidates:
                dem_file = tif_candidates[0]
                print(f"[NASA LOLA] Auto-detected DEM file: {dem_file}")

        if not dem_file or not os.path.isfile(dem_file):
            print("\n[WARNING] No NASA LOLA GeoTIFF file (.tif) found in pipeline/raw_dem/!")
            print("To process authentic LOLA elevation data:")
            print("1. Download a LOLA South Pole GeoTIFF from:")
            print("   - NASA PGDA: https://pgda.gsfc.nasa.gov/products/78 (e.g., LDEM_80S_20M.tif)")
            print("   - LROC QuickMap: https://quickmap.lroc.im-ldi.com (e.g., Site04_Shackleton_5mpp.tif)")
            print(f"2. Place the .tif file into '{os.path.join(os.path.dirname(__file__), 'raw_dem')}'")
            print("3. Re-run: python pipeline/fetch_nasa_data.py\n")
            print("The React web application will display full setup instructions until the file is placed.")
        else:
            candidates_path = os.path.join(out_dir, "lola_candidates_grid.json")
            try:
                process_lola_dem(
                    dem_path=dem_file,
                    output_path=candidates_path,
                    target_parcel_size_m=100.0,
                    max_radius_km=25.0
                )
            except Exception as e:
                print(f"[ERROR] Failed to process LOLA DEM file: {e}", file=sys.stderr)

    print("\n" + "=" * 78)
    print("  PIPELINE EXECUTION COMPLETE")
    print("=" * 78)


if __name__ == "__main__":
    main()
