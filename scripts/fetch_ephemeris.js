import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.resolve(__dirname, '../src/data');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function queryHorizons(targetId, siteLon, siteLat, siteAltKm, startTime, stopTime, stepSize) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      format: 'json',
      COMMAND: `'${targetId}'`,
      EPHEM_TYPE: 'OBSERVER',
      CENTER: "'coord@301'",
      COORD_TYPE: 'GEODETIC',
      SITE_COORD: `'${siteLon},${siteLat},${siteAltKm}'`,
      START_TIME: `'${startTime}'`,
      STOP_TIME: `'${stopTime}'`,
      STEP_SIZE: `'${stepSize}'`,
      QUANTITIES: "'4'"
    });

    const url = `https://ssd.jpl.nasa.gov/api/horizons.api?${params.toString()}`;
    const targetName = targetId === '10' ? 'Sun' : targetId === '399' ? 'Earth' : targetId;
    console.log(`[JPL Horizons] Fetching ${targetName} (${startTime} to ${stopTime})...`);

    https.get(url, { headers: { 'User-Agent': 'NASA-Space-Apps-Navigator/1.0' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
        }
        try {
          const json = JSON.parse(body);
          const rawResult = json.result || '';
          const soe = rawResult.indexOf('$$SOE');
          const eoe = rawResult.indexOf('$$EOE');
          if (soe === -1 || eoe === -1) {
            return reject(new Error('No $$SOE/$$EOE block found in response'));
          }
          const tableContent = rawResult.substring(soe + 5, eoe).trim();
          const records = [];
          
          // Regex to parse: 2026-Jan-01 00:00 *i   32.520769   1.430067
          const lineRegex = /(\d{4}-[A-Za-z]{3}-\d{2}\s+\d{2}:\d{2})(?:[\s\*a-zA-Z]*)\s+([+-]?\d+\.\d+)\s+([+-]?\d+\.\d+)/;

          for (const line of tableContent.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const match = trimmed.match(lineRegex);
            if (match) {
              const dateRaw = match[1];
              const az = parseFloat(match[2]);
              const el = parseFloat(match[3]);
              
              // Parse date into ISO UTC string
              const d = new Date(dateRaw + ' UTC');
              const iso = !isNaN(d.getTime()) ? d.toISOString() : dateRaw;

              records.push({
                timestamp: iso,
                azimuth_deg: Math.round(az * 10000) / 10000,
                elevation_deg: Math.round(el * 10000) / 10000
              });
            }
          }

          console.log(`[JPL Horizons] Successfully parsed ${records.length} steps for ${targetName}.`);
          resolve(records);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const siteLon = 0.0;
  const siteLat = -89.9;
  const siteAltKm = 0.0;
  const startTime = '2026-01-01 00:00';
  const stopTime = '2026-03-31 23:00'; // 3 months of hourly steps (2,160 steps)
  const stepSize = '1 h';

  try {
    const sunRecords = await queryHorizons('10', siteLon, siteLat, siteAltKm, startTime, stopTime, stepSize);
    fs.writeFileSync(
      path.join(outDir, 'ephemeris_sun.json'),
      JSON.stringify({
        target: 'Sun',
        target_id: 10,
        source: 'NASA JPL Horizons REST API',
        observer: 'Lunar body-fixed coord@301',
        latitude: siteLat,
        longitude: siteLon,
        generated_at: new Date().toISOString(),
        records_count: sunRecords.length,
        ephemeris: sunRecords
      }, null, 2)
    );

    const earthRecords = await queryHorizons('399', siteLon, siteLat, siteAltKm, startTime, stopTime, stepSize);
    fs.writeFileSync(
      path.join(outDir, 'ephemeris_earth.json'),
      JSON.stringify({
        target: 'Earth',
        target_id: 399,
        source: 'NASA JPL Horizons REST API',
        observer: 'Lunar body-fixed coord@301',
        latitude: siteLat,
        longitude: siteLon,
        generated_at: new Date().toISOString(),
        records_count: earthRecords.length,
        ephemeris: earthRecords
      }, null, 2)
    );

    console.log('[JPL Horizons] Successfully saved ephemeris_sun.json and ephemeris_earth.json to src/data/');
  } catch (err) {
    console.error('[JPL Horizons Error]:', err);
    process.exit(1);
  }
}

run();
