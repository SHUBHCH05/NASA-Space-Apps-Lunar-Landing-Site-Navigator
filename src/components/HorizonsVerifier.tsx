import React, { useState } from 'react';
import {
  X,
  Radio,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { fetchLiveJplHorizons } from '../services/horizonsApi';
import { LiveHorizonsResult } from '../types/lunar';

interface HorizonsVerifierProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLat?: number;
  defaultLon?: number;
  currentDate: Date;
}

export const HorizonsVerifier: React.FC<HorizonsVerifierProps> = ({
  isOpen,
  onClose,
  defaultLat = -89.9,
  defaultLon = 0.0,
  currentDate,
}) => {
  const [targetId, setTargetId] = useState<string>('10');
  const [lat, setLat] = useState<string>(defaultLat.toFixed(4));
  const [lon, setLon] = useState<string>(defaultLon.toFixed(4));
  const [altKm, setAltKm] = useState<string>('0.0');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<LiveHorizonsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuery = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsedLat = parseFloat(lat);
      const parsedLon = parseFloat(lon);
      const parsedAlt = parseFloat(altKm);

      const res = await fetchLiveJplHorizons(
        targetId,
        parsedLon,
        parsedLat,
        parsedAlt,
        currentDate
      );
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to query NASA JPL Horizons API.');
    } finally {
      setIsLoading(false);
    }
  };

  const setPreset = (pLat: number, pLon: number) => {
    setLat(pLat.toFixed(4));
    setLon(pLon.toFixed(4));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-xl flex flex-col text-slate-800 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-sky-500" />
            <h2 className="text-sm font-semibold">
              NASA JPL Horizons Live Verifier
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Quick presets */}
          <div>
            <span className="text-slate-500 text-[11px] block mb-1">South Pole Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setPreset(-89.9, 0.0)}
                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-sky-400 transition"
              >
                Shackleton (-89.9°, 0°)
              </button>
              <button
                onClick={() => setPreset(-89.5, 222.0)}
                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-sky-400 transition"
              >
                Connecting Ridge (-89.5°, 222°)
              </button>
              <button
                onClick={() => setPreset(-85.99, 2.93)}
                className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-sky-400 transition"
              >
                Malapert (-86°, 3°)
              </button>
            </div>
          </div>

          {/* Coordinate Inputs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Target</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-xs text-slate-800 dark:text-slate-200"
              >
                <option value="10">Sun (10)</option>
                <option value="399">Earth (399)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Latitude</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-xs text-slate-800 dark:text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Longitude</label>
              <input
                type="text"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-xs text-slate-800 dark:text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Altitude (km)</label>
              <input
                type="text"
                value={altKm}
                onChange={(e) => setAltKm(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 text-xs text-slate-800 dark:text-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 font-mono">
              Epoch: {currentDate.toISOString().replace('T', ' ').substring(0, 16)} UTC
            </span>

            <button
              onClick={handleQuery}
              disabled={isLoading}
              className="flex items-center space-x-1.5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Querying...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Query Horizons</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/40 p-2.5 rounded-lg text-rose-700 dark:text-rose-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Result Output */}
          {result && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verified by Horizons (HTTP {result.httpStatus})</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Azimuth</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{result.azimuthDeg}°</span>
                </div>
                <div className="p-2 bg-white dark:bg-slate-800/80 rounded border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block">Elevation</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{result.elevationDeg}°</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
