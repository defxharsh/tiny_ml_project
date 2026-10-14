import { Hand, Cpu, CheckCircle2, AlertTriangle, Layers, Zap, PauseCircle } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';

const GESTURE_CONFIG: Record<
  string,
  { label: string; icon: string; desc: string; color: string; badgeColor: string }
> = {
  fan_on: {
    label: 'Fan ON',
    icon: '🌀',
    desc: 'Turns on ventilation fan via Relay GPIO 13',
    color: '#10b981',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  fan_off: {
    label: 'Fan OFF',
    icon: '🛑',
    desc: 'Deactivates relay and turns off fan',
    color: '#ef4444',
    badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
  idle: {
    label: 'Idle Pose',
    icon: '⏳',
    desc: 'Wrist in neutral resting position, fan state unchanged',
    color: '#8b5cf6',
    badgeColor: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  },
};

export default function GesturePanel() {
  const events = useDashboardStore((s) => s.events);
  const stats = useDashboardStore((s) => s.stats);
  const mode = useDashboardStore((s) => s.mode);
  const inference = useDashboardStore((s) => s.inference);
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);

  if (mode !== 'gesture') return null;

  const gestureEvents = events.filter((e) => e.type === 'gesture');
  const latestEvent = gestureEvents[gestureEvents.length - 1];

  const detected = inference.latestDetected || latestEvent?.label || null;
  const confidence = inference.latestConfidence ?? latestEvent?.confidence ?? null;
  const isConfidencePass = confidence !== null && confidence >= inference.confidenceThreshold;

  const predictions = inference.classPredictions;
  const classes = inference.classes.length > 0 ? inference.classes : ['fan_on', 'fan_off', 'idle'];

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25), transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-accent-violet">
            <Hand className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Gesture Inferencing
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                {inference.modelName}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500">
              Edge Impulse TinyML • MPU-6500 (100 samples @ 50 Hz)
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-zinc-300 font-mono">
            {stats.totalGestures}
          </span>
          <span className="text-[10px] text-zinc-500 block">Total Detections</span>
        </div>
      </div>

      {/* Sampling Status Banner */}
      {inference.isCollecting && (
        <div className="mb-4 py-2 px-3 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 flex items-center gap-2.5 text-xs text-accent-cyan animate-pulse">
          <Cpu className="w-4 h-4 animate-spin" />
          <span>Collecting 100 IMU samples at 50 Hz (2.0s frame)...</span>
        </div>
      )}

      {/* Hero Detected Gesture */}
      {detected ? (
        <div
          className="mb-4 p-4 rounded-xl border border-white/[0.06] relative overflow-hidden"
          style={{
            background:
              detected === 'fan_on'
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(0, 212, 255, 0.05))'
                : detected === 'fan_off'
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(139, 92, 246, 0.05))'
                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(255, 255, 255, 0.02))',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl filter drop-shadow-md">
                {GESTURE_CONFIG[detected]?.icon || '✋'}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-extrabold text-white">
                    {GESTURE_CONFIG[detected]?.label || detected}
                  </h4>
                  {confidence !== null && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isConfidencePass
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}
                    >
                      {(confidence * 100).toFixed(1)}% Match
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {GESTURE_CONFIG[detected]?.desc || 'ESP32 Edge Impulse gesture detected'}
                </p>
              </div>
            </div>

            {/* Action pill */}
            <div className="text-right">
              {isConfidencePass ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Action Executed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" /> Filtered (&lt;65%)
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-5 rounded-xl border border-white/[0.04] bg-white/[0.01] text-center">
          <p className="text-sm text-zinc-500">
            {connectionStatus === 'connected'
              ? 'Listening for wrist gestures (fan_on, fan_off, idle)...'
              : 'Connect wristband or launch simulation to test gestures'}
          </p>
        </div>
      )}

      {/* Model Class Probabilities Distribution */}
      <div className="mb-4 glass-card-subtle p-3.5 rounded-xl border border-white/[0.04]">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-accent-cyan" />
            Class Predictions (Edge Impulse)
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            Threshold: ≥ {(inference.confidenceThreshold * 100).toFixed(0)}%
          </span>
        </div>

        <div className="space-y-2.5">
          {classes.map((cls) => {
            const val = predictions[cls] ?? 0;
            const pct = Math.min(100, Math.max(0, val * 100));
            const isWinner = detected === cls;
            const isAboveThreshold = val >= inference.confidenceThreshold;

            return (
              <div key={cls} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                    <span>{GESTURE_CONFIG[cls]?.icon || '•'}</span>
                    <span className="capitalize">{GESTURE_CONFIG[cls]?.label || cls}</span>
                    {isWinner && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/[0.06] text-accent-cyan font-semibold">
                        DETECTED
                      </span>
                    )}
                  </span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      isAboveThreshold
                        ? 'text-emerald-400'
                        : isWinner
                        ? 'text-amber-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {pct.toFixed(1)}%
                  </span>
                </div>

                {/* Progress bar with threshold marker */}
                <div className="relative w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: GESTURE_CONFIG[cls]?.color || '#00d4ff',
                    }}
                  />
                  {/* Threshold vertical line indicator at 65% */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-white/40 z-10"
                    style={{ left: '65%' }}
                    title="Confidence Threshold (65%)"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent History Table */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Gesture Event Log
        </p>
        <div className="space-y-1 max-h-36 overflow-y-auto">
          {gestureEvents.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-2">No gesture events recorded</p>
          ) : (
            [...gestureEvents]
              .reverse()
              .slice(0, 15)
              .map((e) => {
                const confVal = e.confidence ?? null;
                const isPass = confVal !== null ? confVal >= 0.65 : true;

                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] transition-colors border border-white/[0.02]"
                  >
                    <div className="flex items-center gap-2">
                      <span>{GESTURE_CONFIG[e.label]?.icon || '✋'}</span>
                      <span className="text-xs text-zinc-300 font-medium capitalize">
                        {GESTURE_CONFIG[e.label]?.label || e.label}
                      </span>
                      {confVal !== null && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                            isPass
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {(confVal * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(e.timestamp).toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
