import React, { useMemo } from 'react';
import { Sun, Globe, Radio } from 'lucide-react';
import { LolaParcel, EphemerisFile } from '../types/lunar';
import { getTopocentricAngles } from '../services/astronomicalEngine';
import { getHorizonObstacle } from '../services/siteSelectionEngine';

interface SolarElevationChartProps {
  currentDate: Date;
  parcel: LolaParcel | null;
  sunEphem: EphemerisFile | null;
  earthEphem: EphemerisFile | null;
}

export const SolarElevationChart: React.FC<SolarElevationChartProps> = ({
  currentDate,
  parcel,
  sunEphem,
  earthEphem,
}) => {
  // Generate 14-day projection data points (every 6 hours for 336 hours = 56 steps)
  const chartData = useMemo(() => {
    if (!parcel) return [];

    const points: Array<{
      timeMs: number;
      label: string;
      sunElevation: number;
      earthElevation: number;
      sunObstacle: number;
      isSunlit: boolean;
      isEarthVisible: boolean;
    }> = [];

    const baseTimeMs = currentDate.getTime();
    const hoursSpan = 336; // 14 lunar days of daylight context
    const stepHours = 6;

    for (let h = 0; h <= hoursSpan; h += stepHours) {
      const pointTime = new Date(baseTimeMs + h * 3600 * 1000);
      const angles = getTopocentricAngles(
        pointTime,
        parcel.latitude,
        parcel.longitude,
        sunEphem,
        earthEphem
      );

      const sunObstacle = getHorizonObstacle(parcel.horizon_mask_360, angles.sun.azimuthDeg);
      const earthObstacle = getHorizonObstacle(parcel.horizon_mask_360, angles.earth.azimuthDeg);

      const isSunlit = angles.sun.elevationDeg > sunObstacle;
      const isEarthVisible = angles.earth.elevationDeg > earthObstacle;

      const dayLabel = `+${Math.round(h / 24)}d`;

      points.push({
        timeMs: pointTime.getTime(),
        label: dayLabel,
        sunElevation: Number(angles.sun.elevationDeg.toFixed(2)),
        earthElevation: Number(angles.earth.elevationDeg.toFixed(2)),
        sunObstacle: Number(sunObstacle.toFixed(2)),
        isSunlit,
        isEarthVisible,
      });
    }

    return points;
  }, [currentDate, parcel, sunEphem, earthEphem]);

  if (!parcel || chartData.length === 0) return null;

  // Compute SVG dimensions and coordinate mapping
  const width = 640;
  const height = 230;
  const padLeft = 32;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 28;

  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;

  // Elevation range: -10 deg to +30 deg
  const minEl = -8;
  const maxEl = 24;
  const elRange = maxEl - minEl;

  const getY = (el: number) => {
    const clamped = Math.max(minEl, Math.min(maxEl, el));
    const ratio = (clamped - minEl) / elRange;
    return padTop + chartHeight - ratio * chartHeight;
  };

  const getX = (index: number) => {
    return padLeft + (index / (chartData.length - 1)) * chartWidth;
  };

  // Build SVG path strings
  const sunPath = chartData
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt.sunElevation).toFixed(1)}`)
    .join(' ');

  const earthPath = chartData
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(pt.earthElevation).toFixed(1)}`)
    .join(' ');

  const zeroLineY = getY(0);

  return (
    <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 shadow-sm transition-colors text-xs flex flex-col justify-between h-full gap-2">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-1.5">
          <Radio className="w-3.5 h-3.5 text-sky-500" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
            14-Day Solar & Earth Communication Window
          </h3>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-amber-500 rounded-full" />
            <Sun className="w-3 h-3 text-amber-500" />
            <span className="text-slate-600 dark:text-slate-400">Sun El. (°)</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-0.5 bg-sky-500 rounded-full" />
            <Globe className="w-3 h-3 text-sky-500" />
            <span className="text-slate-600 dark:text-slate-400">Earth El. (°)</span>
          </span>
        </div>
      </div>

      <div className="relative w-full flex-1 flex items-center overflow-hidden my-auto py-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full min-h-[160px] select-none"
          preserveAspectRatio="none"
        >
          {/* Zero degree horizon reference */}
          <line
            x1={padLeft}
            y1={zeroLineY}
            x2={width - padRight}
            y2={zeroLineY}
            stroke="currentColor"
            className="text-slate-300 dark:text-slate-700"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <text
            x={padLeft - 4}
            y={zeroLineY + 3}
            textAnchor="end"
            fontSize="9"
            className="fill-slate-400 font-mono"
          >
            0°
          </text>

          {/* +15 deg reference */}
          <line
            x1={padLeft}
            y1={getY(15)}
            x2={width - padRight}
            y2={getY(15)}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800/60"
            strokeWidth="1"
          />
          <text
            x={padLeft - 4}
            y={getY(15) + 3}
            textAnchor="end"
            fontSize="9"
            className="fill-slate-400 font-mono"
          >
            15°
          </text>

          {/* Day markers along X axis */}
          {chartData.map((pt, i) => {
            if (i % 8 !== 0 && i !== chartData.length - 1) return null;
            const x = getX(i);
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={height - padBottom}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800/40"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="9"
                  className="fill-slate-400 font-mono"
                >
                  {pt.label}
                </text>
              </g>
            );
          })}

          {/* Earth Elevation Line */}
          <path
            d={earthPath}
            fill="none"
            stroke="#0284c7"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Sun Elevation Line */}
          <path
            d={sunPath}
            fill="none"
            stroke="#eab308"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Current Epoch (T=0) Needle */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={height - padBottom}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          <circle
            cx={padLeft}
            cy={getY(chartData[0].sunElevation)}
            r="3.5"
            fill="#eab308"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
          <circle
            cx={padLeft}
            cy={getY(chartData[0].earthElevation)}
            r="3.5"
            fill="#0284c7"
            stroke="#ffffff"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
        <span>Current Sun Elevation: <strong className="text-amber-600 dark:text-amber-400">{chartData[0].sunElevation}°</strong></span>
        <span>Current Earth Elevation: <strong className="text-sky-600 dark:text-sky-400">{chartData[0].earthElevation}°</strong></span>
        <span>Window Status: <strong className={chartData[0].isSunlit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{chartData[0].isSunlit ? 'Daylight (Power OK)' : 'Occulted (Shadow)'}</strong></span>
      </div>
    </div>
  );
};
