import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { MissionControls } from './components/MissionControls';
import { TimelineScrubber } from './components/TimelineScrubber';
import { LunarMap } from './components/LunarMap';
import { TopocentricRadar } from './components/TopocentricRadar';
import { TelemetryPanel } from './components/TelemetryPanel';
import { CandidateList } from './components/CandidateList';
import { HorizonsVerifier } from './components/HorizonsVerifier';
import { DataIngestionModal } from './components/DataIngestionModal';
import { QuickStartGuide } from './components/QuickStartGuide';
import { Footer } from './components/Footer';

import {
  LolaParcel,
  LolaGridFile,
  EphemerisFile,
  MissionProfile,
  ParcelEvaluation,
} from './types/lunar';
import {
  MISSION_PROFILES,
  rankCandidateParcels,
  evaluateParcel,
} from './services/siteSelectionEngine';

import sunEphemRaw from './data/ephemeris_sun.json';
import earthEphemRaw from './data/ephemeris_earth.json';
import lolaGridRaw from './data/lola_candidates_grid.json';

// Type-cast imported JSON data
const initialSunEphem = sunEphemRaw as unknown as EphemerisFile;
const initialEarthEphem = earthEphemRaw as unknown as EphemerisFile;
const initialGrid = lolaGridRaw as unknown as LolaGridFile;

export function App() {
  // Theme state: dark or light
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('lunar-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('lunar-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Ephemeris & DEM Datasets state
  const [sunEphem, setSunEphem] = useState<EphemerisFile | null>(initialSunEphem);
  const [earthEphem, setEarthEphem] = useState<EphemerisFile | null>(initialEarthEphem);
  const [lolaGrid, setLolaGrid] = useState<LolaGridFile | null>(initialGrid);

  // Time & Playback state
  const defaultStartDate = new Date('2026-01-01T00:00:00Z');
  const defaultEndDate = new Date('2026-03-31T23:00:00Z');

  const [currentDate, setCurrentDate] = useState<Date>(defaultStartDate);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(24);

  // Mission Profile state
  const [mission, setMission] = useState<MissionProfile>(MISSION_PROFILES.clps);

  // Selected Parcel state
  const [selectedParcel, setSelectedParcel] = useState<LolaParcel | null>(null);
  const [autoLockBest, setAutoLockBest] = useState<boolean>(true);

  // Modals state
  const [isVerifierOpen, setIsVerifierOpen] = useState<boolean>(false);
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState<boolean>(false);
  const [isQuickGuideOpen, setIsQuickGuideOpen] = useState<boolean>(() => {
    return !localStorage.getItem('lunar-guide-seen');
  });
  const [customCoord, setCustomCoord] = useState<{ lat: number; lon: number } | null>(null);

  // Reload datasets dynamically
  const reloadData = useCallback(async () => {
    try {
      const sunRes = await fetch('/src/data/ephemeris_sun.json');
      if (sunRes.ok) {
        const data = await sunRes.json();
        setSunEphem(data);
      }
    } catch {
      console.warn('Could not reload ephemeris_sun.json');
    }

    try {
      const earthRes = await fetch('/src/data/ephemeris_earth.json');
      if (earthRes.ok) {
        const data = await earthRes.json();
        setEarthEphem(data);
      }
    } catch {
      console.warn('Could not reload ephemeris_earth.json');
    }

    try {
      const gridRes = await fetch('/src/data/lola_candidates_grid.json');
      if (gridRes.ok) {
        const data = await gridRes.json();
        setLolaGrid(data);
      }
    } catch {
      console.warn('Could not reload lola_candidates_grid.json');
    }
  }, []);

  // Compute Ranked Evaluations for all parcels
  const rankedEvaluations: ParcelEvaluation[] = useMemo(() => {
    if (!lolaGrid?.parcels || lolaGrid.parcels.length === 0) {
      return [];
    }
    return rankCandidateParcels(lolaGrid.parcels, currentDate, mission, sunEphem, earthEphem);
  }, [lolaGrid, currentDate, mission, sunEphem, earthEphem]);

  // Automatically calculate and lock onto the #1 optimal parcel when date/time or mission changes
  useEffect(() => {
    if (autoLockBest && rankedEvaluations.length > 0) {
      setSelectedParcel(rankedEvaluations[0].parcel);
    }
  }, [currentDate, mission, autoLockBest, rankedEvaluations]);

  // Selected Parcel Evaluation
  const selectedEvaluation: ParcelEvaluation | null = useMemo(() => {
    if (!selectedParcel) return null;
    return evaluateParcel(selectedParcel, currentDate, mission, sunEphem, earthEphem);
  }, [selectedParcel, currentDate, mission, sunEphem, earthEphem]);

  // Safety distribution stats
  const stats = useMemo(() => {
    let optimal = 0;
    let warning = 0;
    let unviable = 0;

    rankedEvaluations.forEach((item) => {
      if (item.status === 'optimal') optimal++;
      else if (item.status === 'warning') warning++;
      else unviable++;
    });

    return {
      optimal,
      warning,
      unviable,
      total: rankedEvaluations.length,
    };
  }, [rankedEvaluations]);

  const handleCustomMissionUpdate = (maxSlope: number, minSunHours: number) => {
    setMission({
      ...MISSION_PROFILES.custom,
      maxSlopeDeg: maxSlope,
      minSunHours: minSunHours,
    });
  };

  const handleMapClickCustom = (lat: number, lon: number) => {
    setAutoLockBest(false);
    const customParcel: LolaParcel = {
      id: `SITE_${Math.abs(lat).toFixed(2)}${lat < 0 ? 'S' : 'N'}_${Math.abs(lon).toFixed(2)}${lon < 0 ? 'W' : 'E'}`,
      name: `Custom 100m Site (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
      region: lat < -80 ? 'South Polar Region' : lat > 80 ? 'North Polar Region' : 'Lunar Surface',
      latitude: Number(lat.toFixed(4)),
      longitude: Number(lon.toFixed(4)),
      mean_elevation_m: 0,
      max_slope_deg: 2.2,
      horizon_mask_360: new Array(360).fill(0.6),
      parcel_size_m: 100.0,
    };
    setSelectedParcel(customParcel);
    setCustomCoord({ lat, lon });
  };

  const handleManualSelectParcel = (parcel: LolaParcel) => {
    setAutoLockBest(false);
    setSelectedParcel(parcel);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070b12] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Global Header */}
      <Header
        currentDate={currentDate}
        mission={mission}
        parcelCount={lolaGrid?.parcel_count ?? 0}
        hasDemData={Boolean(lolaGrid && lolaGrid.parcels.length > 0)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenVerifier={() => setIsVerifierOpen(true)}
        onOpenSetupGuide={() => setIsSetupGuideOpen(true)}
        onOpenQuickGuide={() => setIsQuickGuideOpen(true)}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-3 sm:p-4 flex flex-col gap-3">
        {/* Mission Controls */}
        <MissionControls
          currentMission={mission}
          onSelectMission={setMission}
          optimalCount={stats.optimal}
          warningCount={stats.warning}
          unviableCount={stats.unviable}
          totalCount={stats.total}
          onCustomUpdate={handleCustomMissionUpdate}
        />

        {/* Timeline Scrubber */}
        <TimelineScrubber
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          playbackSpeed={playbackSpeed}
          onChangeSpeed={setPlaybackSpeed}
          startDate={defaultStartDate}
          endDate={defaultEndDate}
          hasEphemeris={Boolean(sunEphem && earthEphem)}
        />

        {/* Active Landing Spot Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800/80 rounded-xl px-3.5 py-2 shadow-sm text-xs transition-colors">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${autoLockBest ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'}`} />
            <span className="text-slate-500 dark:text-slate-400">
              {autoLockBest ? 'Autonomous Global Landing Spot Selected:' : 'Selected Landing Area:'}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {selectedParcel?.name || selectedParcel?.id}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              ({selectedParcel ? `${selectedParcel.latitude.toFixed(2)}°, ${selectedParcel.longitude.toFixed(2)}°` : ''})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
              100m × 100m Box Plotted on Map
            </span>
            <button
              onClick={() => {
                setAutoLockBest(true);
                if (rankedEvaluations.length > 0) setSelectedParcel(rankedEvaluations[0].parcel);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                autoLockBest
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {autoLockBest ? '✓ Auto-Locked to Best Spot' : 'Auto-Calculate Best Spot'}
            </button>
          </div>
        </div>

        {/* Central Display: Map, Radar, Telemetry & Candidates */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1">
          {/* Left Column: Lunar Map & Topocentric Radar */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex-1 min-h-[440px] lg:min-h-[500px]">
              <LunarMap
                evaluations={rankedEvaluations}
                selectedParcel={selectedParcel}
                onSelectParcel={handleManualSelectParcel}
                onMapClickCustomCoord={handleMapClickCustom}
              />
            </div>

            <TopocentricRadar
              evaluation={selectedEvaluation}
              parcel={selectedParcel}
              theme={theme}
            />
          </div>

          {/* Right Column: Telemetry HUD & Candidates List */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <TelemetryPanel
              evaluation={selectedEvaluation}
              mission={mission}
            />

            <CandidateList
              evaluations={rankedEvaluations}
              selectedParcel={selectedParcel}
              onSelectParcel={handleManualSelectParcel}
            />
          </div>
        </div>
      </main>

      {/* Permanent Scientific Footer */}
      <Footer />

      {/* Quick Start Guide Modal */}
      <QuickStartGuide
        isOpen={isQuickGuideOpen}
        onClose={() => {
          setIsQuickGuideOpen(false);
          localStorage.setItem('lunar-guide-seen', 'true');
        }}
        onTryPreset={(targetDate) => {
          setCurrentDate(targetDate);
          setAutoLockBest(true);
        }}
      />

      {/* Live JPL Horizons Verifier Modal */}
      <HorizonsVerifier
        isOpen={isVerifierOpen}
        onClose={() => setIsVerifierOpen(false)}
        defaultLat={customCoord?.lat ?? selectedParcel?.latitude ?? -89.9}
        defaultLon={customCoord?.lon ?? selectedParcel?.longitude ?? 0.0}
        currentDate={currentDate}
      />

      {/* Data Ingestion Pipeline Setup Modal */}
      <DataIngestionModal
        isOpen={isSetupGuideOpen}
        onClose={() => setIsSetupGuideOpen(false)}
        hasDemData={Boolean(lolaGrid && lolaGrid.parcels.length > 0)}
        hasEphemeris={Boolean(sunEphem && earthEphem)}
        parcelCount={lolaGrid?.parcel_count ?? 0}
        onRefreshData={reloadData}
      />
    </div>
  );
}

export default App;
