import React from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface DataIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasDemData: boolean;
  hasEphemeris: boolean;
  parcelCount: number;
  onRefreshData: () => void;
}

export const DataIngestionModal: React.FC<DataIngestionModalProps> = ({
  isOpen,
  onClose,
  hasDemData,
  hasEphemeris,
  parcelCount,
  onRefreshData,
}) => {
  const [copiedCmd, setCopiedCmd] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(text);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-xl flex flex-col text-slate-800 dark:text-slate-100 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold">NASA Data Ingestion Setup</h2>
            <p className="text-xs text-slate-500">Real LOLA GeoTIFFs & JPL Horizons Ingestion</p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 text-xs">
          {/* Status Badges */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <span className="text-[10px] text-slate-400 block mb-0.5">JPL Horizons Ephemeris</span>
              <div className="flex items-center space-x-1.5 text-xs font-medium">
                {hasEphemeris ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>2,160 Steps Ingested</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Missing</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
              <span className="text-[10px] text-slate-400 block mb-0.5">LOLA 100m Parcels</span>
              <div className="flex items-center space-x-1.5 text-xs font-medium">
                {hasDemData ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{parcelCount} Parcels Ready</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span>Pending Run</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick instructions */}
          <div className="space-y-3">
            <div>
              <span className="font-semibold block mb-1">1. Download LOLA GeoTIFF</span>
              <div className="flex gap-2">
                <a
                  href="https://pgda.gsfc.nasa.gov/products/78"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-sky-500 transition text-[11px]"
                >
                  <span>NASA PGDA</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://quickmap.lroc.im-ldi.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-sky-500 transition text-[11px]"
                >
                  <span>LROC QuickMap</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div>
              <span className="font-semibold block mb-1">2. Run Python Ingestion Suite</span>
              <div className="space-y-1.5">
                <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <code>pip install -r pipeline/requirements.txt</code>
                  <button
                    onClick={() => copyToClipboard('pip install -r pipeline/requirements.txt')}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {copiedCmd === 'pip install -r pipeline/requirements.txt' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <code>python pipeline/fetch_nasa_data.py</code>
                  <button
                    onClick={() => copyToClipboard('python pipeline/fetch_nasa_data.py')}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {copiedCmd === 'python pipeline/fetch_nasa_data.py' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">Data outputs save to src/data/</span>
            <button
              onClick={() => {
                onRefreshData();
                onClose();
              }}
              className="flex items-center space-x-1.5 bg-sky-500 hover:bg-sky-400 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Datasets</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
