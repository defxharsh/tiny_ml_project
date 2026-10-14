import { ScrollText, Trash2 } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import type { EventType } from '../types';

const TYPE_STYLES: Record<EventType, { color: string; bg: string; icon: string }> = {
  voice_command: { color: 'text-cyan-400', bg: 'bg-cyan-400/10', icon: '🎙' },
  gesture:       { color: 'text-violet-400', bg: 'bg-violet-400/10', icon: '✋' },
  sensor:        { color: 'text-blue-400', bg: 'bg-blue-400/10', icon: '📡' },
  status:        { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: '✓' },
  info:          { color: 'text-zinc-400', bg: 'bg-zinc-400/5', icon: 'ℹ' },
  error:         { color: 'text-red-400', bg: 'bg-red-400/10', icon: '⚠' },
};

export default function EventTimeline() {
  const events = useDashboardStore((s) => s.events);
  const clearEvents = useDashboardStore((s) => s.clearEvents);
  const displayPaused = useDashboardStore((s) => s.displayPaused);

  // Filter to show only meaningful events (not raw sensor updates)
  const displayEvents = events.filter((e) => e.type !== 'sensor');
  const reversed = [...displayEvents].reverse().slice(0, 100);

  return (
    <div className="glass-card p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-accent-blue" />
          Event Timeline
          {displayPaused && (
            <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full">PAUSED</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-600">{displayEvents.length} events</span>
          <button
            onClick={clearEvents}
            className="p-1.5 rounded-lg hover:bg-white/[0.04] text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Clear events"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-80 space-y-0.5">
        {reversed.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-zinc-700 text-xs">
            No events yet
          </div>
        ) : (
          reversed.map((e) => {
            const style = TYPE_STYLES[e.type] || TYPE_STYLES.info;
            return (
              <div
                key={e.id}
                className="flex items-start gap-2 py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors group"
              >
                {/* Time dot */}
                <div className="flex flex-col items-center mt-0.5">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] ${style.bg}`}>
                    {style.icon}
                  </span>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${style.color}`}>
                    {e.label}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                    {new Date(e.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    <span className="ml-2 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                      {e.raw}
                    </span>
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
