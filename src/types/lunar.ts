/**
 * Lunar Landing Site Navigator - TypeScript Definitions
 * NASA Space Apps Challenge
 */

export interface LolaParcel {
  id: string;
  name?: string;            // Landmark name, e.g. "Shackleton Connecting Ridge"
  region?: string;          // Region, e.g. "Lunar South Pole"
  latitude: number;         // Selenographic latitude (-90 to +90 deg)
  longitude: number;        // Selenographic longitude (-180 to +180 deg)
  mean_elevation_m: number; // Meters relative to R_M = 1737.4 km
  max_slope_deg: number;    // Maximum surface slope in degrees
  horizon_mask_360: number[]; // 360 obstacle elevation angles (deg) from 0° to 359°
  projected_x_m?: number;
  projected_y_m?: number;
  parcel_size_m: number;    // Usually 100 meters
}

export interface LolaGridFile {
  source: string;
  dem_file: string;
  generated_at: string;
  lunar_radius_km: number;
  parcel_count: number;
  parcels: LolaParcel[];
}

export interface EphemerisRecord {
  timestamp: string;        // ISO 8601 UTC
  azimuth_deg: number;      // 0 to 360 deg
  elevation_deg: number;    // -90 to +90 deg
}

export interface EphemerisFile {
  target: 'Sun' | 'Earth';
  target_id: 10 | 399;
  source: string;
  observer: string;
  latitude: number;
  longitude: number;
  generated_at: string;
  records_count: number;
  ephemeris: EphemerisRecord[];
}

export type MissionProfileId = 'clps' | 'artemis' | 'custom';

export interface MissionProfile {
  id: MissionProfileId;
  name: string;
  shortName: string;
  maxSlopeDeg: number;
  minSunHours: number;
  description: string;
  badgeColor: string;
}

export type ParcelStatus = 'optimal' | 'warning' | 'unviable';

export interface ParcelEvaluation {
  parcel: LolaParcel;
  status: ParcelStatus;
  sunAzimuth: number;
  sunElevation: number;
  earthAzimuth: number;
  earthElevation: number;
  sunHorizonObstacle: number;
  earthHorizonObstacle: number;
  solarMarginDeg: number;
  earthMarginDeg: number;
  isSunlit: boolean;
  isEarthVisible: boolean;
  isSlopeSafe: boolean;
  solarIrradianceWm2: number;
  hoursUntilSunset: number;
  hoursUntilEarthset: number;
  score: number;
  reasons: string[];
}

export interface LiveHorizonsResult {
  queryUrl: string;
  httpStatus: number;
  timestamp: string;
  target: string;
  targetId: string;
  siteCoord: string;
  azimuthDeg: number;
  elevationDeg: number;
  rawSnippet: string;
  verifiedAt: string;
}
