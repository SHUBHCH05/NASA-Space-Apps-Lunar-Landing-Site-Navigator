import React from 'react';
import { ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#070b14] px-4 py-3 mt-auto text-xs text-slate-500 dark:text-slate-400 transition-colors">
      <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-end gap-2.5">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px]">
          <span className="text-slate-400 dark:text-slate-500">Official Sources:</span>
          
          <a
            href="https://ssd.jpl.nasa.gov/horizons/"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 flex items-center space-x-0.5 transition"
          >
            <span>JPL Horizons</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          <a
            href="https://www.lroc.asu.edu/"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 flex items-center space-x-0.5 transition"
          >
            <span>LROC SOC</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          <a
            href="https://pgda.gsfc.nasa.gov/"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 flex items-center space-x-0.5 transition"
          >
            <span>NASA LOLA (PDS)</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          <a
            href="https://pradan.issdc.gov.in/"
            target="_blank"
            rel="noreferrer"
            className="text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 flex items-center space-x-0.5 transition"
            title="ISRO Chandrayaan-2/3 Science Data (ISSDC / PRADAN)"
          >
            <span>ISRO ISSDC (Chandrayaan)</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </footer>
  );
};
