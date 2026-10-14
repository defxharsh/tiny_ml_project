import { X, Sliders, RotateCcw } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';

export default function SettingsPanel() {
  const open = useDashboardStore((s) => s.settingsOpen);
  const setOpen = useDashboardStore((s) => s.setSettingsOpen);
  const maxHistoryPoints = useDashboardStore((s) => s.maxHistoryPoints);
  const setMaxHistoryPoints = useDashboardStore((s) => s.setMaxHistoryPoints);
  const resetSession = useDashboardStore((s) => s.resetSession);
  const baudRate = useDashboardStore((s) => s.baudRate);
  const mode = useDashboardStore((s) => s.mode);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass-card-elevated p-6 w-full max-w-sm mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-accent-violet" />
            <h2 className="text-lg font-semibold text-white">Settings</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="glass-card-subtle p-3 rounded-lg">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Current Config</p>
            <div className="flex justify-between text-xs text-zinc-400">
              <span>Baud Rate</span>
              <span className="font-mono text-zinc-300">{baudRate}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-400 mt-1">
              <span>Mode</span>
              <span className="capitalize text-zinc-300">{mode}</span>
            </div>
          </div>

          {/* Chart history */}
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
              Chart History Points
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={50}
                max={500}
                step={50}
                value={maxHistoryPoints}
                onChange={(e) => setMaxHistoryPoints(Number(e.target.value))}
                className="flex-1 accent-accent-cyan"
              />
              <span className="text-sm font-mono text-zinc-300 w-10 text-right">{maxHistoryPoints}</span>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">
              More points = smoother charts but more memory usage
            </p>
          </div>

          {/* Reset session */}
          <button
            onClick={() => { resetSession(); setOpen(false); }}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Session Data
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/[0.04]">
          <p className="text-[10px] text-zinc-700 text-center">
            TinyGest Dashboard v1.0.0 • ESP32 Wristband Monitor
          </p>
        </div>
      </div>
    </div>
  );
}
