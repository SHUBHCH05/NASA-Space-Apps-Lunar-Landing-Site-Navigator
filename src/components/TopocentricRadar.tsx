import React, { useEffect, useRef } from 'react';
import { Compass, Sun, Globe } from 'lucide-react';
import { LolaParcel, ParcelEvaluation } from '../types/lunar';

interface TopocentricRadarProps {
  evaluation: ParcelEvaluation | null;
  parcel: LolaParcel | null;
  theme?: 'dark' | 'light';
}

export const TopocentricRadar: React.FC<TopocentricRadarProps> = ({
  evaluation,
  parcel,
  theme = 'dark',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.min(width, height) / 2 - 24;

    ctx.clearRect(0, 0, width, height);

    const isDark = theme === 'dark';

    // Canvas Background
    ctx.fillStyle = isDark ? '#0c1322' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    const project = (azDeg: number, elDeg: number) => {
      const azRad = ((azDeg - 90) * Math.PI) / 180.0;
      const normR = Math.max(0, Math.min(1.15, (90.0 - elDeg) / 90.0));
      const r = normR * maxRadius;
      return {
        x: cx + r * Math.cos(azRad),
        y: cy + r * Math.sin(azRad),
      };
    };

    // Elevation Rings
    const rings = [
      { el: 60, label: '60°' },
      { el: 30, label: '30°' },
      { el: 0, label: '0° Horizon' },
    ];

    rings.forEach(({ el, label }) => {
      const r = ((90.0 - el) / 90.0) * maxRadius;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.strokeStyle = el === 0
        ? (isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(2, 132, 199, 0.4)')
        : (isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.25)');
      ctx.lineWidth = el === 0 ? 1.5 : 1;
      ctx.stroke();

      ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.6)' : 'rgba(100, 116, 139, 0.8)';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(label, cx + 4, cy - r + 11);
    });

    // Cardinals
    const cardinals = [
      { deg: 0, label: 'N' },
      { deg: 90, label: 'E' },
      { deg: 180, label: 'S' },
      { deg: 270, label: 'W' },
    ];

    cardinals.forEach(({ deg, label }) => {
      const { x, y } = project(deg, 0);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.12)' : 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const labelPt = project(deg, -9);
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.font = '500 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelPt.x, labelPt.y);
    });

    // 360° LOLA Horizon Mask Silhouette
    if (parcel && parcel.horizon_mask_360 && parcel.horizon_mask_360.length === 360) {
      const mask = parcel.horizon_mask_360;

      ctx.beginPath();
      for (let az = 0; az < 360; az++) {
        const obstEl = mask[az];
        const pt = project(az, obstEl);
        if (az === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();

      ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)';
      ctx.fill();

      ctx.strokeStyle = isDark ? 'rgba(248, 113, 113, 0.7)' : 'rgba(220, 38, 38, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Plot Sun and Earth
    if (evaluation) {
      const { sunAzimuth, sunElevation, earthAzimuth, earthElevation, isSunlit, isEarthVisible } = evaluation;

      // Sun
      const sunPt = project(sunAzimuth, sunElevation);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sunPt.x, sunPt.y);
      ctx.strokeStyle = isSunlit ? 'rgba(234, 179, 8, 0.4)' : 'rgba(239, 68, 68, 0.3)';
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(sunPt.x, sunPt.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = isSunlit ? '#eab308' : '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '500 10px Inter, sans-serif';
      ctx.fillStyle = isSunlit ? (isDark ? '#fef08a' : '#854d0e') : '#ef4444';
      ctx.textAlign = 'left';
      ctx.fillText(`Sun (${sunElevation.toFixed(1)}°)`, sunPt.x + 8, sunPt.y - 4);

      // Earth
      const earthPt = project(earthAzimuth, earthElevation);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(earthPt.x, earthPt.y);
      ctx.strokeStyle = isEarthVisible ? 'rgba(2, 132, 199, 0.4)' : 'rgba(217, 119, 6, 0.4)';
      ctx.setLineDash([3, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(earthPt.x, earthPt.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = isEarthVisible ? '#0284c7' : '#d97706';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '500 10px Inter, sans-serif';
      ctx.fillStyle = isEarthVisible ? (isDark ? '#7dd3fc' : '#0369a1') : '#d97706';
      ctx.textAlign = 'left';
      ctx.fillText(`Earth (${earthElevation.toFixed(1)}°)`, earthPt.x + 8, earthPt.y + 10);
    }

    // Center Zenith
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, 2 * Math.PI);
    ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
    ctx.fill();
  }, [evaluation, parcel, theme]);

  const isSunlit = evaluation?.isSunlit ?? false;
  const isEarthVisible = evaluation?.isEarthVisible ?? false;

  return (
    <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 shadow-sm flex flex-col transition-colors">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center space-x-1.5">
          <Compass className="w-3.5 h-3.5 text-sky-500" />
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Topocentric Sky & Horizon Radar
          </h3>
        </div>
        <span className="text-[10px] text-slate-400" title="The shaded red polygon shows surrounding crater walls up to 25 km away blocking low angles.">
          360° Crater Horizon Mask
        </span>
      </div>

      <div className="text-[10px] text-slate-500 dark:text-slate-400 px-1 mb-1">
        Displays positions of the Sun <span className="text-amber-500 font-semibold">(●)</span> and Earth <span className="text-sky-500 font-semibold">(●)</span> relative to surrounding crater ridges.
      </div>

      <div className="flex items-center justify-center my-auto py-1">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="w-full max-w-[280px] aspect-square rounded-full border border-slate-200 dark:border-slate-800"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        {/* Sun Status */}
        <div className={`p-2 rounded-lg border ${
          isSunlit
            ? 'bg-yellow-50/60 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-300'
            : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span className="flex items-center space-x-1">
              <Sun className="w-3 h-3 text-yellow-500" />
              <span>Solar Status</span>
            </span>
            <span>{isSunlit ? 'Sunlit' : 'Shadow'}</span>
          </div>
          <div className="text-[10px] mt-0.5 text-slate-500 dark:text-slate-400">
            Margin: <span className="font-semibold">{evaluation?.solarMarginDeg.toFixed(2)}°</span>
          </div>
        </div>

        {/* Earth Status */}
        <div className={`p-2 rounded-lg border ${
          isEarthVisible
            ? 'bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-500/30 text-sky-800 dark:text-sky-300'
            : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span className="flex items-center space-x-1">
              <Globe className="w-3 h-3 text-sky-500" />
              <span>Earth Comm</span>
            </span>
            <span>{isEarthVisible ? 'Direct' : 'Occulted'}</span>
          </div>
          <div className="text-[10px] mt-0.5 text-slate-500 dark:text-slate-400">
            Margin: <span className="font-semibold">{evaluation?.earthMarginDeg.toFixed(2)}°</span>
          </div>
        </div>
      </div>
    </div>
  );
};
