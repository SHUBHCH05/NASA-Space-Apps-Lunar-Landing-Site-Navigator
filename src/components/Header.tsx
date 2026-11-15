import React from 'react';
import {
  Compass,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
  HelpCircle
} from 'lucide-react';
import { MissionProfile } from '../types/lunar';

interface HeaderProps {
  currentDate: Date;
  mission: MissionProfile;
  parcelCount: number;
  hasDemData: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenVerifier: () => void;
  onOpenSetupGuide: () => void;
  onOpenQuickGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  mission,
  parcelCount,
  hasDemData,
  theme,
  onToggleTheme,
  onOpenVerifier,
  onOpenSetupGuide,
  onOpenQuickGuide,
}) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0b101b]/90 backdrop-blur-md sticky top-0 z-40 px-4 py-2.5 transition-colors">
      <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                NASA Space Apps
              </span>
            </div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
              Lunar Landing Site Navigator
            </h1>
          </div>
        </div>

        {/* Center: Mission & UTC Time */}
        <div className="hidden md:flex items-center space-x-4 bg-slate-50 dark:bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Mission:</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {mission.shortName}
            </span>
          </div>

          <div className="h-3 w-px bg-slate-300 dark:bg-slate-700" />

          <div className="flex items-center space-x-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-400">UTC:</span>
            <span className="font-semibold text-slate-800 dark:text-emerald-400">
              {currentDate.toISOString().replace('T', ' ').substring(0, 16)}Z
            </span>
          </div>
        </div>

        {/* Right: Actions & Theme Toggle */}
        <div className="flex items-center space-x-2">
          {/* Status Badge */}
          <button
            onClick={onOpenSetupGuide}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs border transition ${
              hasDemData
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
            }`}
          >
            {hasDemData ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{parcelCount} Parcels</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>DEM Setup</span>
              </>
            )}
          </button>

          {/* Verifier Button */}
          <button
            onClick={onOpenVerifier}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Radio className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">JPL Horizons</span>
          </button>

          {/* Quick Guide Button */}
          <button
            onClick={onOpenQuickGuide}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition"
            title="Beginner Quick Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">How to Use</span>
          </button>

          {/* Setup Guide */}
          <button
            onClick={onOpenSetupGuide}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            title="Setup & Data Documentation"
          >
            <span className="text-[11px] font-mono font-medium px-0.5">Docs</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
