import React from 'react';
import {
  Zap,
  Mountain,
  Sun,
  Globe,
  Hourglass,
  Radio,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { ParcelEvaluation, MissionProfile } from '../types/lunar';

interface TelemetryPanelProps {
  evaluation: ParcelEvaluation | null;
  mission: MissionProfile;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  evaluation,
  mission,
}) => {
  if (!evaluation) {
    return (
      <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 text-center text-slate-400 text-xs">
        No candidate parcel selected.
      </div>
    );
  }

  const {
    parcel,
    status,
    sunElevation,
    earthElevation,
    solarMarginDeg,
    earthMarginDeg,
    isSlopeSafe,
    solarIrradianceWm2,
    hoursUntilSunset,
    hoursUntilEarthset,
    score,
    reasons,
  } = evaluation;

  const statusBadge =
    status === 'optimal' ? (
      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Optimal Site</span>
      </span>
    ) : status === 'warning' ? (
      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
        <AlertTriangle className="w-3.5 h-3.5" />
        <span>Earth Occulted</span>
      </span>
    ) : (
      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30">
        <XCircle className="w-3.5 h-3.5" />
        <span>Unviable</span>
      </span>
    );

  return (
    <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 shadow-sm flex flex-col gap-3 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-900 dark:text-white">{parcel.name || parcel.id}</span>
            <span>•</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">100m × 100m Landing Zone</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {parcel.region} ({parcel.id})
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {statusBadge}
          <div className="px-2 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200" title="Overall Landing Safety Score out of 100">
            {score}<span className="text-slate-400 font-normal">/100</span>
          </div>
        </div>
      </div>

      {/* Beginner-friendly Plain English Assessment */}
      <div className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
        status === 'optimal'
          ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
          : status === 'warning'
          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'
          : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
      }`}>
        <div className="flex items-center space-x-1.5 font-semibold text-[11px] mb-0.5">
          <span>Landing Suitability Assessment:</span>
        </div>
        <p className="text-[11px]">
          {status === 'optimal'
            ? `Prime landing site. The 100m area has continuous sunlight (+${solarMarginDeg}° above crater rim), an unobstructed direct radio link to Earth (+${earthMarginDeg}° above terrain), and a flat ${parcel.max_slope_deg}° slope preventing lander tip-over.`
            : status === 'warning'
            ? `Solar power is available (+${solarMarginDeg}°), but direct radio communication with Earth is occulted behind local terrain/crater ridges (Earth margin ${earthMarginDeg}°). Relay satellite required.`
            : `Unviable for landing at this time. ${reasons.join(', ')}.`}
        </p>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        {/* Coordinates */}
        <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-2 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
            Coordinates
          </span>
          <div className="font-mono text-slate-800 dark:text-slate-200 text-[11px] leading-tight">
            {parcel.latitude.toFixed(4)}°, {parcel.longitude.toFixed(4)}°
          </div>
        </div>

        {/* Mean Elevation */}
        <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-2 rounded-lg">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
            Elevation
          </span>
          <div className="flex items-center space-x-1 text-slate-800 dark:text-slate-200 font-semibold">
            <Mountain className="w-3 h-3 text-emerald-500" />
            <span>{parcel.mean_elevation_m > 0 ? `+${parcel.mean_elevation_m}` : parcel.mean_elevation_m}m</span>
          </div>
        </div>

        {/* Slope */}
        <div className={`p-2 rounded-lg border ${
          isSlopeSafe
            ? 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80'
            : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30'
        }`} title={`Maximum terrain tilt in 100m parcel. Must be ≤ ${mission.maxSlopeDeg}° to prevent lander tipping.`}>
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase mb-0.5">
            <span>Surface Slope</span>
            <span>≤{mission.maxSlopeDeg}°</span>
          </div>
          <div className={`font-semibold ${isSlopeSafe ? 'text-slate-800 dark:text-slate-200' : 'text-rose-600 dark:text-rose-400'}`}>
            {parcel.max_slope_deg}°
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {isSlopeSafe ? 'Safe (No tip risk)' : 'Too steep (Tipping risk)'}
          </span>
        </div>

        {/* Solar Margin */}
        <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-2 rounded-lg" title="Degrees of the Sun above surrounding crater walls. Greater than 0° means direct sunlight hits solar panels.">
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase mb-0.5">
            <span>Solar Margin</span>
            <Sun className="w-3 h-3 text-amber-500" />
          </div>
          <div className={`font-semibold ${solarMarginDeg > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {solarMarginDeg > 0 ? `+${solarMarginDeg}°` : `${solarMarginDeg}°`}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Sun: {sunElevation.toFixed(1)}°
          </span>
        </div>

        {/* Earth RF Margin */}
        <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-2 rounded-lg" title="Degrees of the Earth above surrounding crater rims. Greater than 0° means direct antenna line-of-sight to Earth.">
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase mb-0.5">
            <span>Earth Margin</span>
            <Globe className="w-3 h-3 text-sky-500" />
          </div>
          <div className={`font-semibold ${earthMarginDeg > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {earthMarginDeg > 0 ? `+${earthMarginDeg}°` : `${earthMarginDeg}°`}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Earth: {earthElevation.toFixed(1)}°
          </span>
        </div>

        {/* Irradiance */}
        <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-2 rounded-lg">
          <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase mb-0.5">
            <span>Irradiance</span>
            <Zap className="w-3 h-3 text-amber-500" />
          </div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            {solarIrradianceWm2} <span className="text-[10px] font-normal text-slate-400">W/m²</span>
          </div>
        </div>
      </div>

      {/* Countdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
            <Hourglass className="w-3.5 h-3.5 text-amber-500" />
            <span>Continuous Sunlight:</span>
          </div>
          <span className={`font-semibold ${hoursUntilSunset >= mission.minSunHours ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {hoursUntilSunset}h
          </span>
        </div>

        <div className="bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 px-2.5 py-1.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
            <Radio className="w-3.5 h-3.5 text-sky-500" />
            <span>Earth Visibility:</span>
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {hoursUntilEarthset}h
          </span>
        </div>
      </div>

      {/* Advisory Warnings */}
      {reasons.length > 0 && (
        <div className="bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 p-2 rounded-lg text-xs text-rose-700 dark:text-rose-300">
          <span className="font-semibold block text-[11px] mb-0.5">Constraint Notes:</span>
          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
