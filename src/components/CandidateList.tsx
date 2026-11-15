import React, { useState } from 'react';
import {
  ListFilter,
  Search,
} from 'lucide-react';
import { LolaParcel, ParcelEvaluation } from '../types/lunar';

interface CandidateListProps {
  evaluations: ParcelEvaluation[];
  selectedParcel: LolaParcel | null;
  onSelectParcel: (parcel: LolaParcel) => void;
}

export const CandidateList: React.FC<CandidateListProps> = ({
  evaluations,
  selectedParcel,
  onSelectParcel,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = evaluations.filter((item) => {
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.parcel.id.toLowerCase().includes(q) ||
        item.parcel.latitude.toString().includes(q) ||
        item.parcel.longitude.toString().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 shadow-sm flex flex-col h-full max-h-[460px] transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center space-x-1.5">
          <ListFilter className="w-3.5 h-3.5 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Ranked Parcels ({filtered.length})
          </h3>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 text-[11px]">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2 py-0.5 rounded transition ${
              filterStatus === 'all'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('optimal')}
            className={`px-2 py-0.5 rounded transition ${
              filterStatus === 'optimal'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-500/30'
                : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            Optimal
          </button>
          <button
            onClick={() => setFilterStatus('warning')}
            className={`px-2 py-0.5 rounded transition ${
              filterStatus === 'warning'
                ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-500/30'
                : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
          >
            Occulted
          </button>
          <button
            onClick={() => setFilterStatus('unviable')}
            className={`px-2 py-0.5 rounded transition ${
              filterStatus === 'unviable'
                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium border border-rose-200 dark:border-rose-500/30'
                : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'
            }`}
          >
            Unviable
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-2">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        <input
          type="text"
          placeholder="Search by ID or Coordinate..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500"
        />
      </div>

      {/* Table List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 text-xs">
        {filtered.map((item, index) => {
          const isSelected = selectedParcel?.id === item.parcel.id;
          const dotColor =
            item.status === 'optimal'
              ? 'bg-emerald-500'
              : item.status === 'warning'
              ? 'bg-amber-500'
              : 'bg-rose-500';

          return (
            <div
              key={item.parcel.id}
              onClick={() => onSelectParcel(item.parcel)}
              className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-between gap-2 ${
                isSelected
                  ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-500/50'
                  : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              {/* ID & Status Dot */}
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-400 w-4 text-right">
                  #{index + 1}
                </span>
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <span className="truncate max-w-[150px]">{item.parcel.name || item.parcel.id}</span>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    {item.parcel.region ? `${item.parcel.region} • ` : ''}{item.parcel.latitude.toFixed(2)}°, {item.parcel.longitude.toFixed(2)}°
                  </div>
                </div>
              </div>

              {/* Slope & Elev */}
              <div className="hidden sm:flex flex-col text-[11px] text-right">
                <span className="text-slate-600 dark:text-slate-300">
                  Slope: <span className={item.isSlopeSafe ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-rose-600 dark:text-rose-400 font-medium'}>{item.parcel.max_slope_deg}°</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  Elev: {item.parcel.mean_elevation_m}m
                </span>
              </div>

              {/* Score */}
              <div className="flex items-center space-x-2.5 text-right">
                <div className="flex flex-col text-[10px]">
                  <span className={item.isSunlit ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                    Sun: {item.solarMarginDeg > 0 ? `+${item.solarMarginDeg}°` : `${item.solarMarginDeg}°`}
                  </span>
                  <span className={item.isEarthVisible ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'}>
                    RF: {item.earthMarginDeg > 0 ? `+${item.earthMarginDeg}°` : `${item.earthMarginDeg}°`}
                  </span>
                </div>

                <div className="w-8 text-center">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.score}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-xs">
            No parcels match the filter.
          </div>
        )}
      </div>
    </div>
  );
};
