import { useState, useEffect, useRef } from 'react';
import { Terminal, Trash2, Pause, Play, ChevronDown, ChevronUp, Filter, Download } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { exportMessagesToCsv } from '../lib/csvExport';

type FilterType = 'all' | 'vitals' | 'gestures' | 'actions' | 'errors';

export default function SerialConsole() {
  const rawMessages = useDashboardStore((s) => s.rawMessages);
  const clearRawMessages = useDashboardStore((s) => s.clearRawMessages);
  const displayPaused = useDashboardStore((s) => s.displayPaused);
  const toggleDisplayPaused = useDashboardStore((s) => s.toggleDisplayPaused);
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);
  const baudRate = useDashboardStore((s) => s.baudRate);

  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!displayPaused && scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [rawMessages.length, displayPaused, expanded]);

  const filteredMessages = rawMessages.filter((msg) => {
    if (filter === 'all') return true;
    const raw = msg.raw.toLowerCase();
    if (filter === 'vitals') return raw.includes('heart rate') || raw.includes('spo2');
    if (filter === 'gestures') return raw.includes('prediction') || raw.includes('detected') || raw.includes('fan_on') || raw.includes('fan_off') || raw.includes('confidence');
    if (filter === 'actions') return raw.includes('action:');
    if (filter === 'errors') return raw.includes('error') || raw.includes('low confidence');
    return true;
  });

  const displayMessages = displayPaused
    ? filteredMessages
    : filteredMessages.slice(-250);

  const getLineColor = (raw: string): string => {
    if (/action:\s*fan/i.test(raw)) return 'text-emerald-400 font-bold';
    if (/heart\s*rate|spo2/i.test(raw)) return 'text-cyan-400 font-semibold';
    if (/detected:\s*/i.test(raw)) return 'text-violet-400 font-bold';
    if (/--- gesture predictions ---/i.test(raw)) return 'text-purple-300 font-medium';
    if (/(?:fan_on|fan_off|idle)\s*:/i.test(raw)) return 'text-indigo-300';
    if (/collecting\s*gesture/i.test(raw)) return 'text-amber-300/80 italic';
    if (/error|not detected/i.test(raw)) return 'text-rose-400 font-medium';
    if (/low confidence/i.test(raw)) return 'text-amber-400';
    return 'text-zinc-400';
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Serial Monitor
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                {baudRate} Baud
              </span>
              {connectionStatus === 'connected' && (
                <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Stream
                </span>
              )}
            </h3>
            <p className="text-[11px] text-zinc-500">
              Direct Web Serial API read from ESP32 USB COM port
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportMessagesToCsv(rawMessages)}
            disabled={rawMessages.length === 0}
            className="p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white transition-colors border border-white/[0.04] disabled:opacity-30"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] text-zinc-400 hover:text-white transition-colors border border-white/[0.04]"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Console body */}
      {expanded && (
        <div>
          {/* Controls & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-white/[0.04] bg-surface-950/40">
            {/* Filter pills */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-500 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {(['all', 'actions', 'vitals', 'gestures', 'errors'] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[10px] px-2 py-0.5 rounded-md capitalize font-medium transition-colors border ${
                    filter === f
                      ? 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30'
                      : 'bg-white/[0.02] text-zinc-500 border-transparent hover:text-zinc-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDisplayPaused}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  displayPaused
                    ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                }`}
                title={displayPaused ? 'Resume display' : 'Pause display'}
              >
                {displayPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {displayPaused ? 'Resume' : 'Pause'}
              </button>

              <button
                onClick={clearRawMessages}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                title="Clear console"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div
            ref={scrollRef}
            className="font-mono text-[11px] leading-5 p-4 max-h-72 overflow-y-auto bg-black/40"
          >
            {displayMessages.length === 0 ? (
              <div className="text-zinc-600 text-center py-8">
                {connectionStatus === 'connected'
                  ? 'Awaiting serial output from ESP32...'
                  : 'Serial stream idle. Click "Connect USB Serial" to start streaming from your ESP32.'}
              </div>
            ) : (
              displayMessages.map((msg, i) => (
                <div key={`${msg.timestamp}-${i}`} className="flex gap-2 hover:bg-white/[0.02] rounded px-1">
                  <span className="text-zinc-600 select-none flex-shrink-0 text-[10px]">
                    {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className={`break-all ${getLineColor(msg.raw)}`}>
                    {msg.raw}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
