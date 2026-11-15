import React from 'react';
import { Rocket, UserCheck, Sliders } from 'lucide-react';
import { MissionProfile } from '../types/lunar';
import { MISSION_PROFILES } from '../services/siteSelectionEngine';

interface MissionControlsProps {
  currentMission: MissionProfile;
  onSelectMission: (profile: MissionProfile) => void;
  optimalCount: number;
  warningCount: number;
  unviableCount: number;
  totalCount: number;
  onCustomUpdate?: (maxSlope: number, minSunHours: number) => void;
}

export const MissionControls: React.FC<MissionControlsProps> = ({
  currentMission,
  onSelectMission,
  optimalCount,
  warningCount,
  unviableCount,
  totalCount,
  onCustomUpdate,
}) => {
  const isCustom = currentMission.id === 'custom';

  return (
    <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 shadow-sm transition-colors">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Profile Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 font-medium mr-1.5">
            Mission:
          </span>

          <button
            onClick={() => onSelectMission(MISSION_PROFILES.clps)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition ${
              currentMission.id === 'clps'
                ? 'bg-sky-50 dark:bg-sky-500/10 border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-sky-500" />
            <span>CLPS (≤8°, ≥72h Sun)</span>
          </button>

          <button
            onClick={() => onSelectMission(MISSION_PROFILES.artemis)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition ${
              currentMission.id === 'artemis'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Artemis (≤5°, ≥168h Sun)</span>
          </button>

          <button
            onClick={() => onSelectMission(MISSION_PROFILES.custom)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition ${
              isCustom
                ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/40 text-purple-700 dark:text-purple-300'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-purple-500" />
            <span>Custom</span>
          </button>
        </div>

        {/* Safety Distribution Badges */}
        <div className="flex items-center space-x-2 text-xs w-full lg:w-auto justify-end">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Optimal: {optimalCount}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Occulted: {warningCount}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Unviable: {unviableCount}</span>
          </div>

          <span className="hidden sm:inline text-slate-400 dark:text-slate-600 text-xs">
            / {totalCount}
          </span>
        </div>
      </div>

      {/* Custom Profile Sliders */}
      {isCustom && onCustomUpdate && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
              <span>Max Slope Tolerance:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">{currentMission.maxSlopeDeg}°</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              step="0.5"
              value={currentMission.maxSlopeDeg}
              onChange={(e) => onCustomUpdate(parseFloat(e.target.value), currentMission.minSunHours)}
              className="w-full accent-purple-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
              <span>Min Continuous Sunlight:</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">{currentMission.minSunHours}h</span>
            </div>
            <input
              type="range"
              min="12"
              max="336"
              step="6"
              value={currentMission.minSunHours}
              onChange={(e) => onCustomUpdate(currentMission.maxSlopeDeg, parseInt(e.target.value, 10))}
              className="w-full accent-purple-600 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
