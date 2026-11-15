import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Clock,
  Calendar,
} from 'lucide-react';

interface TimelineScrubberProps {
  currentDate: Date;
  onDateChange: (newDate: Date) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  playbackSpeed: number;
  onChangeSpeed: (speed: number) => void;
  startDate: Date;
  endDate: Date;
  hasEphemeris: boolean;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  currentDate,
  onDateChange,
  isPlaying,
  onTogglePlay,
  playbackSpeed,
  onChangeSpeed,
  startDate,
  endDate,
  hasEphemeris,
}) => {
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const totalDurationMs = endDate.getTime() - startDate.getTime();
  const currentProgressMs = Math.max(0, Math.min(totalDurationMs, currentDate.getTime() - startDate.getTime()));
  const progressRatio = totalDurationMs > 0 ? currentProgressMs / totalDurationMs : 0;

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      lastTimeRef.current = null;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const deltaMs = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const simulatedDeltaMs = deltaMs * playbackSpeed * 3600;
      let nextTimeMs = currentDate.getTime() + simulatedDeltaMs;

      if (nextTimeMs > endDate.getTime()) {
        nextTimeMs = startDate.getTime();
      }

      onDateChange(new Date(nextTimeMs));
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, playbackSpeed, currentDate, startDate, endDate, onDateChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ratio = parseFloat(e.target.value);
    const newTimeMs = startDate.getTime() + ratio * totalDurationMs;
    onDateChange(new Date(newTimeMs));
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value; // "YYYY-MM-DD"
    if (!dateStr) return;
    const [y, m, d] = dateStr.split('-').map(Number);
    const newD = new Date(currentDate);
    newD.setUTCFullYear(y, m - 1, d);
    onDateChange(newD);
  };

  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value; // "HH:MM"
    if (!timeStr) return;
    const [h, min] = timeStr.split(':').map(Number);
    const newD = new Date(currentDate);
    newD.setUTCHours(h, min, 0, 0);
    onDateChange(newD);
  };

  const stepHours = (hours: number) => {
    const newTimeMs = currentDate.getTime() + hours * 3600 * 1000;
    onDateChange(new Date(newTimeMs));
  };

  const handleReset = () => {
    onDateChange(new Date(startDate.getTime()));
  };

  const speedOptions = [1, 6, 24, 72, 168];

  const currentDateString = currentDate.toISOString().substring(0, 10);
  const currentTimeString = currentDate.toISOString().substring(11, 16);

  return (
    <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 shadow-sm transition-colors flex flex-col gap-3">
      {/* Top: Direct Date & Time Selector + Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium">
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            <span>Select Date & Time:</span>
          </div>

          {/* Date Picker Input */}
          <input
            type="date"
            value={currentDateString}
            onChange={handleDateInputChange}
            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-sky-500"
          />

          {/* Time Picker Input */}
          <div className="flex items-center space-x-1">
            <input
              type="time"
              value={currentTimeString}
              onChange={handleTimeInputChange}
              className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-sky-500"
            />
            <span className="text-[11px] text-slate-400 font-mono">UTC</span>
          </div>
        </div>

        {/* Quick Date Epoch Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 hidden sm:inline">Presets:</span>
          <button
            onClick={() => onDateChange(new Date('2026-01-01T00:00:00Z'))}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-sky-500 transition"
          >
            Jan 1, 2026
          </button>
          <button
            onClick={() => onDateChange(new Date('2026-01-18T12:00:00Z'))}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-sky-500 transition"
          >
            South Pole Max Sun
          </button>
          <button
            onClick={() => onDateChange(new Date('2026-09-15T00:00:00Z'))}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-sky-500 transition"
          >
            Artemis III Target
          </button>
          <button
            onClick={() => onDateChange(new Date('2023-08-23T12:34:00Z'))}
            className="px-2 py-0.5 rounded border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 transition"
            title="ISRO Chandrayaan-3 Historic Touchdown at Shiv Shakti Point (Aug 23, 2023 12:34 UTC)"
          >
            🇮🇳 Chandrayaan-3 Landing
          </button>
          <button
            onClick={() => onDateChange(new Date())}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-sky-500 transition"
          >
            Current Time
          </button>
        </div>
      </div>

      {/* Middle: Timeline Slider Bar */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
          {startDate.toISOString().substring(0, 10)}
        </span>

        <div className="relative flex-1 flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.0001"
            value={progressRatio}
            onChange={handleSliderChange}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500 focus:outline-none"
          />
        </div>

        <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
          {endDate.toISOString().substring(0, 10)}
        </span>
      </div>

      {/* Bottom: Play/Pause Controls & Speed */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
        <div className="flex items-center space-x-1">
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
            title="Reset to Start"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => stepHours(-24)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-mono transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            -24h
          </button>

          <button
            onClick={() => stepHours(-1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-sky-500 text-white hover:bg-sky-400'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Animation</span>
              </>
            )}
          </button>

          <button
            onClick={() => stepHours(1)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => stepHours(24)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-xs font-mono transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            +24h
          </button>
        </div>

        {/* Live Calculation Indicator */}
        <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <Clock className="w-3.5 h-3.5 text-sky-500" />
          <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-200">
            {currentDate.toISOString().replace('T', ' ').substring(0, 16)} UTC
          </span>
          {hasEphemeris && (
            <span className="text-[10px] text-sky-600 dark:text-sky-400 font-mono px-1 rounded bg-sky-100 dark:bg-sky-950/40">
              JPL Horizons Active
            </span>
          )}
        </div>

        {/* Speed Selector */}
        <div className="flex items-center space-x-1 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <span className="text-[10px] text-slate-400 px-1 font-medium">Speed:</span>
          {speedOptions.map((speed) => (
            <button
              key={speed}
              onClick={() => onChangeSpeed(speed)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition ${
                playbackSpeed === speed
                  ? 'bg-sky-500 text-white font-medium'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {speed}h/s
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
