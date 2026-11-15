/**
 * Autonomous 100m x 100m Lunar Landing Site Selection Engine
 * Evaluates candidates against real LOLA terrain and JPL Horizons ephemerides.
 */

import {
  LolaParcel,
  MissionProfile,
  ParcelEvaluation,
  ParcelStatus,
  EphemerisFile,
} from '../types/lunar';
import {
  getTopocentricAngles,
  computeEffectiveSolarIrradiance,
} from './astronomicalEngine';

export const MISSION_PROFILES: Record<string, MissionProfile> = {
  clps: {
    id: 'clps',
    name: 'Robotic Lander Profile',
    shortName: 'Robotic Lander',
    maxSlopeDeg: 8.0,
    minSunHours: 72,
    description: 'Robotic lander configuration. 8° tipping hazard limit, 72h minimum continuous sunlight for battery charging.',
    badgeColor: 'border-blue-500/50 text-blue-400 bg-blue-500/10',
  },
  artemis: {
    id: 'artemis',
    name: 'Crewed Lander Profile',
    shortName: 'Crewed Lander',
    maxSlopeDeg: 5.0,
    minSunHours: 168,
    description: 'Crewed lander configuration. Stringent 5° astronaut egress safety limit, 168h (7 days) continuous solar power margin.',
    badgeColor: 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
  },
  custom: {
    id: 'custom',
    name: 'Custom Mission Profile',
    shortName: 'Custom Profile',
    maxSlopeDeg: 10.0,
    minSunHours: 24,
    description: 'User-configured mission thresholds for slope tolerances, solar duration, and RF comm margins.',
    badgeColor: 'border-purple-500/50 text-purple-400 bg-purple-500/10',
  },
};

/**
 * Lookup obstacle elevation in 360-degree horizon mask for a given azimuth angle.
 */
export function getHorizonObstacle(horizonMask: number[], azimuthDeg: number): number {
  if (!horizonMask || horizonMask.length !== 360) return 0.0;
  let idx = Math.round(azimuthDeg) % 360;
  if (idx < 0) idx += 360;
  return horizonMask[idx] ?? 0.0;
}

/**
 * Estimate hours until next sunset and next earthset from current timestamp
 * by scanning future hours in the ephemeris.
 */
function estimateCountdowns(
  currentTimeMs: number,
  parcel: LolaParcel,
  sunEphemFile?: EphemerisFile | null,
  earthEphemFile?: EphemerisFile | null
): { hoursUntilSunset: number; hoursUntilEarthset: number } {
  let hoursUntilSunset = 72; // Default reasonable fallback
  let hoursUntilEarthset = 720;

  if (sunEphemFile?.ephemeris && sunEphemFile.ephemeris.length > 0) {
    const ephem = sunEphemFile.ephemeris;
    // Find current index
    const startIndex = ephem.findIndex((r) => new Date(r.timestamp).getTime() >= currentTimeMs);
    if (startIndex !== -1) {
      let sunHours = 0;
      for (let i = startIndex; i < ephem.length; i++) {
        const step = ephem[i];
        const obst = getHorizonObstacle(parcel.horizon_mask_360, step.azimuth_deg);
        if (step.elevation_deg > obst) {
          sunHours += 1;
        } else {
          break; // Sunset encountered
        }
      }
      hoursUntilSunset = sunHours;
    }
  }

  if (earthEphemFile?.ephemeris && earthEphemFile.ephemeris.length > 0) {
    const ephem = earthEphemFile.ephemeris;
    const startIndex = ephem.findIndex((r) => new Date(r.timestamp).getTime() >= currentTimeMs);
    if (startIndex !== -1) {
      let earthHours = 0;
      for (let i = startIndex; i < ephem.length; i++) {
        const step = ephem[i];
        const obst = getHorizonObstacle(parcel.horizon_mask_360, step.azimuth_deg);
        if (step.elevation_deg > obst) {
          earthHours += 1;
        } else {
          break; // Earth occulted
        }
      }
      hoursUntilEarthset = earthHours;
    }
  }

  return { hoursUntilSunset, hoursUntilEarthset };
}

/**
 * Evaluate a single 100m x 100m parcel at a given date/time against mission constraints.
 */
export function evaluateParcel(
  parcel: LolaParcel,
  date: Date,
  mission: MissionProfile,
  sunEphemFile?: EphemerisFile | null,
  earthEphemFile?: EphemerisFile | null
): ParcelEvaluation {
  // Get real topocentric angles
  const { sun, earth } = getTopocentricAngles(
    date,
    parcel.latitude,
    parcel.longitude,
    sunEphemFile,
    earthEphemFile
  );

  // Horizon obstacle at Sun and Earth azimuths
  const sunObstacle = getHorizonObstacle(parcel.horizon_mask_360, sun.azimuthDeg);
  const earthObstacle = getHorizonObstacle(parcel.horizon_mask_360, earth.azimuthDeg);

  // Clearance margins
  const solarMarginDeg = Number((sun.elevationDeg - sunObstacle).toFixed(2));
  const earthMarginDeg = Number((earth.elevationDeg - earthObstacle).toFixed(2));

  // Physical constraints
  const isSlopeSafe = parcel.max_slope_deg <= mission.maxSlopeDeg;
  const isSunlit = solarMarginDeg > 0;
  const isEarthVisible = earthMarginDeg > 0;

  // Status classification according to NASA criteria:
  // Green (#22c55e): Optimal (Sunlit + Direct Earth Comm + Safe Slope)
  // Amber (#eab308): Power OK, Earth Line-of-Sight Occulted by Terrain
  // Red (#ef4444): Unviable (Topographic Shadow / Lunar Night or Excessive Slope)
  let status: ParcelStatus = 'unviable';
  const reasons: string[] = [];

  if (!isSlopeSafe) {
    reasons.push(`Max slope ${parcel.max_slope_deg}° exceeds mission safety limit of ${mission.maxSlopeDeg}°`);
  }

  if (!isSunlit) {
    reasons.push(`Sun elevation (${sun.elevationDeg}°) is occulted by ${sunObstacle}° crater rim / ridge (Topographic Shadow)`);
  }

  if (isSlopeSafe && isSunlit) {
    if (isEarthVisible) {
      status = 'optimal';
    } else {
      status = 'warning';
      reasons.push(`Direct Earth line-of-sight (${earth.elevationDeg}°) is blocked by ${earthObstacle}° crater obstacle`);
    }
  }

  // Countdowns
  const { hoursUntilSunset, hoursUntilEarthset } = estimateCountdowns(
    date.getTime(),
    parcel,
    sunEphemFile,
    earthEphemFile
  );

  // Effective solar irradiance (W/m^2)
  const solarIrradianceWm2 = isSunlit
    ? computeEffectiveSolarIrradiance(sun.elevationDeg, sunObstacle)
    : 0.0;

  // Multi-objective ranking score (0 to 100)
  // Normalized flatness: 1 - (slope / maxSlope)
  const flatnessRatio = Math.max(0, 1.0 - parcel.max_slope_deg / (mission.maxSlopeDeg * 1.5));
  // Solar margin score: max 5 deg margin considered excellent
  const solarScore = Math.max(0, Math.min(1.0, solarMarginDeg / 3.0));
  // Earth margin score
  const earthScore = Math.max(0, Math.min(1.0, earthMarginDeg / 5.0));
  // Continuous duration score
  const durationScore = Math.min(1.0, hoursUntilSunset / mission.minSunHours);

  let rawScore = 0;
  if (status === 'optimal') {
    rawScore = 55 + 15 * flatnessRatio + 15 * solarScore + 10 * earthScore + 5 * durationScore;
  } else if (status === 'warning') {
    rawScore = 25 + 15 * flatnessRatio + 15 * solarScore + 5 * durationScore;
  } else {
    // Unviable penalty
    rawScore = Math.max(0, 20 * flatnessRatio - (isSlopeSafe ? 0 : 10));
  }

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  return {
    parcel,
    status,
    sunAzimuth: sun.azimuthDeg,
    sunElevation: sun.elevationDeg,
    earthAzimuth: earth.azimuthDeg,
    earthElevation: earth.elevationDeg,
    sunHorizonObstacle: sunObstacle,
    earthHorizonObstacle: earthObstacle,
    solarMarginDeg,
    earthMarginDeg,
    isSunlit,
    isEarthVisible,
    isSlopeSafe,
    solarIrradianceWm2,
    hoursUntilSunset,
    hoursUntilEarthset,
    score,
    reasons,
  };
}

/**
 * Scan all parcels in the grid and rank them from best to worst.
 */
export function rankCandidateParcels(
  parcels: LolaParcel[],
  date: Date,
  mission: MissionProfile,
  sunEphemFile?: EphemerisFile | null,
  earthEphemFile?: EphemerisFile | null
): ParcelEvaluation[] {
  const evaluations = parcels.map((p) =>
    evaluateParcel(p, date, mission, sunEphemFile, earthEphemFile)
  );

  // Rank: Optimal first (sorted by score descending), then Warning, then Unviable
  evaluations.sort((a, b) => {
    const statusPriority = { optimal: 3, warning: 2, unviable: 1 };
    if (statusPriority[a.status] !== statusPriority[b.status]) {
      return statusPriority[b.status] - statusPriority[a.status];
    }
    return b.score - a.score;
  });

  return evaluations;
}
