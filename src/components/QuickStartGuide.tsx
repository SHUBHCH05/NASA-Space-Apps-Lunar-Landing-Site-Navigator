import React from 'react';
import { X, Play, Sparkles } from 'lucide-react';

interface QuickStartGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onTryPreset: (date: Date) => void;
}

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({
  isOpen,
  onClose,
  onTryPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 text-slate-800 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">How to Use the Lunar Navigator</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Find the safest 100m landing zone in 3 simple steps</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Step Cards */}
        <div className="py-4 space-y-3 text-xs">
          <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-white font-semibold text-xs shrink-0 mt-0.5">
              1
            </span>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-0.5">Pick Any Date & Time</h3>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                Use the date and time picker at the top, or click a quick preset like <em>"Artemis III Target"</em>. You can also press <Play className="w-2.5 h-2.5 inline fill-current text-sky-500" /> Play to see sunlight move over time.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-white font-semibold text-xs shrink-0 mt-0.5">
              2
            </span>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-0.5">Automatic 100m Site Selection</h3>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                The program instantly calculates Sun sunlight and Earth communication across the Moon and draws the optimal <strong>100m × 100m landing box</strong> right on the map.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-white font-semibold text-xs shrink-0 mt-0.5">
              3
            </span>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-0.5">Understand the 3 Colors</h3>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />
                <strong className="text-emerald-600 dark:text-emerald-400">Green (Optimal):</strong> Sunlit + Direct Earth Radio + Flat surface.<br />
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />
                <strong className="text-amber-600 dark:text-amber-400">Amber (Occulted):</strong> Has solar power, but Earth is blocked by crater hills.<br />
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-1" />
                <strong className="text-rose-600 dark:text-rose-400">Red (Unviable):</strong> Lunar night darkness or steep slope hazard.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Try Button */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              onTryPreset(new Date('2026-09-15T00:00:00Z'));
              onClose();
            }}
            className="flex items-center space-x-1.5 text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
          >
            <span>Try Artemis III Target Date (Sep 2026)</span>
          </button>

          <button
            onClick={onClose}
            className="bg-sky-500 hover:bg-sky-400 text-white font-medium px-4 py-1.5 rounded-lg text-xs transition"
          >
            Got it, Let's Explore!
          </button>
        </div>
      </div>
    </div>
  );
};
