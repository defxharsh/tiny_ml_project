import { BarChart3, Clock, Zap, MessageSquare, Download } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { exportEventsCSV, exportSensorCSV } from '../lib/csvExport';

export default function StatsPanel() {
  const stats = useDashboardStore((s) => s.stats);
  const events = useDashboardStore((s) => s.events);
  const sensorHistory = useDashboardStore((s) => s.sensorHistory);
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);
  const mode = useDashboardStore((s) => s.mode);

  const isConnected = connectionStatus === 'connected';

  // Session duration
  const elapsed = isConnected ? Math.floor((Date.now() - stats.startTime) / 1000) : 0;
  const durationStr = elapsed > 0
    ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
    : '—';

  // Sensor stat cards
  const sensorEntries = Object.entries(stats.sensorStats);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-accent-pink" />
          Session Statistics
        </h3>
        {/* Export buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => exportEventsCSV(events)}
            disabled={events.length === 0}
            className="p-1.5 rounded-lg hover:bg-white/[0.04] text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Export events CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => exportSensorCSV(sensorHistory)}
            disabled={Object.keys(sensorHistory).length === 0}
            className="p-1.5 rounded-lg hover:bg-white/[0.04] text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Export sensor data CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="stat-card">
          <span className="stat-label">
            <Clock className="w-3 h-3 inline mr-1" />Duration
          </span>
          <span className="stat-value text-lg">{durationStr}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">
            <MessageSquare className="w-3 h-3 inline mr-1" />Messages
          </span>
          <span className="stat-value text-lg">{stats.totalMessages}</span>
          <span className="stat-sub">{stats.messagesPerMinute}/min</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">
            <Zap className="w-3 h-3 inline mr-1" />{mode === 'voice' ? 'Commands' : 'Gestures'}
          </span>
          <span className="stat-value text-lg">
            {mode === 'voice' ? stats.totalCommands : stats.totalGestures}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Valid</span>
          <span className="stat-value text-lg">{stats.validMessages}</span>
          <span className="stat-sub">
            {stats.totalMessages > 0
              ? `${Math.round((stats.validMessages / stats.totalMessages) * 100)}%`
              : '—'}
          </span>
        </div>
      </div>

      {/* Sensor min/max/avg */}
      {sensorEntries.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-2">
            Sensor Ranges
          </p>
          <div className="space-y-2">
            {sensorEntries.map(([name, s]) => (
              <div key={name} className="flex items-center gap-2 text-[11px]">
                <span className="text-zinc-500 w-16 truncate font-medium" title={name}>
                  {name.replace(/_/g, ' ')}
                </span>
                <div className="flex-1 flex items-center gap-1">
                  <span className="text-blue-400 font-mono">{s.min.toFixed(1)}</span>
                  <div className="flex-1 h-1 rounded-full bg-white/[0.03] relative">
                    <div
                      className="absolute top-0 h-1 rounded-full"
                      style={{
                        left: `${Math.max(0, ((s.avg - s.min) / (s.max - s.min || 1)) * 100 - 2)}%`,
                        width: '4%',
                        background: '#8b5cf6',
                      }}
                    />
                  </div>
                  <span className="text-red-400 font-mono">{s.max.toFixed(1)}</span>
                </div>
                <span className="text-zinc-400 font-mono w-12 text-right">μ{s.avg.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
