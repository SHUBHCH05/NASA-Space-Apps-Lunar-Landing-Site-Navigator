/**
 * NASA JPL Horizons REST API Client
 * Official Endpoint: https://ssd.jpl.nasa.gov/api/horizons.api
 * 
 * Supports:
 * - Direct queries
 * - Vite dev proxy (/api/horizons)
 * - Ephemeris block parsing ($$SOE ... $$EOE)
 */

import { LiveHorizonsResult } from '../types/lunar';

export async function fetchLiveJplHorizons(
  targetId: string, // '10' for Sun, '399' for Earth
  siteLon: number,
  siteLat: number,
  siteAltKm: number = 0.0,
  targetDate: Date = new Date()
): Promise<LiveHorizonsResult> {
  // Format start and stop time (1-hour window)
  const dt = new Date(targetDate);
  const pad = (n: number) => String(n).padStart(2, '0');
  const startStr = `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} ${pad(dt.getUTCHours())}:00`;
  
  const dtStop = new Date(dt.getTime() + 2 * 3600 * 1000);
  const stopStr = `${dtStop.getUTCFullYear()}-${pad(dtStop.getUTCMonth() + 1)}-${pad(dtStop.getUTCDate())} ${pad(dtStop.getUTCHours())}:00`;

  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${targetId}'`,
    EPHEM_TYPE: 'OBSERVER',
    CENTER: "'coord@301'",
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: `'${siteLon.toFixed(4)},${siteLat.toFixed(4)},${siteAltKm.toFixed(3)}'`,
    START_TIME: `'${startStr}'`,
    STOP_TIME: `'${stopStr}'`,
    STEP_SIZE: "'1 h'",
    QUANTITIES: "'4'",
  });

  const directUrl = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
  const proxyUrl = `/api/horizons?${params.toString()}`;

  let response: Response | null = null;
  let usedUrl = directUrl;

  // Try proxy first (avoids CORS in browser), fallback to direct URL
  try {
    response = await fetch(proxyUrl, { headers: { 'Accept': 'application/json' } });
    usedUrl = proxyUrl;
  } catch (proxyErr) {
    console.warn('[JPL Horizons] Proxy query failed, trying direct URL:', proxyErr);
    try {
      response = await fetch(directUrl, { headers: { 'Accept': 'application/json' } });
      usedUrl = directUrl;
    } catch (directErr) {
      throw new Error(`Failed to reach JPL Horizons API: ${(directErr as Error).message}. Check network connection.`);
    }
  }

  if (!response || !response.ok) {
    throw new Error(`Horizons API returned HTTP status ${response ? response.status : 'ERR'}`);
  }

  const json = await response.json();
  const rawResult = json.result || '';

  const soeIdx = rawResult.indexOf('$$SOE');
  const eoeIdx = rawResult.indexOf('$$EOE');

  if (soeIdx === -1 || eoeIdx === -1) {
    throw new Error(`No $$SOE...$$EOE ephemeris block in Horizons response. Response snippet: ${rawResult.slice(0, 300)}`);
  }

  const table = rawResult.substring(soeIdx + 5, eoeIdx).trim();
  const firstLine = table.split('\n')[0] || '';

  // Regex to extract azimuth and elevation:
  // e.g. "2026-Jan-01 00:00 *i   32.520769   1.430067"
  const lineMatch = firstLine.match(/(\d{4}-[A-Za-z]{3}-\d{2}\s+\d{2}:\d{2})(?:[\s\*a-zA-Z]*)\s+([+-]?\d+\.\d+)\s+([+-]?\d+\.\d+)/);

  if (!lineMatch) {
    throw new Error(`Failed to parse Horizons table line: "${firstLine}"`);
  }

  const az = parseFloat(lineMatch[2]);
  const el = parseFloat(lineMatch[3]);

  return {
    queryUrl: usedUrl,
    httpStatus: response.status,
    timestamp: lineMatch[1],
    target: targetId === '10' ? 'Sun' : targetId === '399' ? 'Earth' : `Body #${targetId}`,
    targetId,
    siteCoord: `${siteLon.toFixed(4)}°E, ${siteLat.toFixed(4)}°N, ${siteAltKm.toFixed(3)}km`,
    azimuthDeg: Number(az.toFixed(4)),
    elevationDeg: Number(el.toFixed(4)),
    rawSnippet: rawResult.substring(soeIdx, Math.min(rawResult.length, soeIdx + 450)),
    verifiedAt: new Date().toISOString(),
  };
}
