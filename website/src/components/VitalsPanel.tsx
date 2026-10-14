import { Heart, Activity, Droplets, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';

export default function VitalsPanel() {
  const vitals = useDashboardStore((s) => s.vitals);
  const inference = useDashboardStore((s) => s.inference);
  const voiceInference = useDashboardStore((s) => s.voiceInference);
  const mode = useDashboardStore((s) => s.mode);
  const stats = useDashboardStore((s) => s.stats);
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);

  const isConnected = connectionStatus === 'connected';
  const maxStatus = mode === 'voice' ? voiceInference.max30100Status : inference.max30100Status;
  const hasHeartRate = vitals.heartRate !== null && vitals.heartRate > 0;
  const hasSpO2 = vitals.spO2 !== null && vitals.spO2 > 0;

  const hrStats = stats.sensorStats['Heart_Rate'];
  const spo2Stats = stats.sensorStats['SpO2'];

  const hrValue = vitals.heartRate ?? hrStats?.current ?? null;
  const spo2Value = vitals.spO2 ?? spo2Stats?.current ?? null;

  // Status tiers
  const getHrTier = (bpm: number) => {
    if (bpm < 60) return { label: 'Bradycardia (Low)', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    if (bpm <= 100) return { label: 'Normal Resting', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    return { label: 'Elevated Rate', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  const getSpO2Tier = (spo2: number) => {
    if (spo2 >= 95) return { label: 'Optimal Saturation', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
    if (spo2 >= 90) return { label: 'Normal Range', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    return { label: 'Low Oxygen Attention', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute -top-10 -right-10 w-48 h-48 pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.25), transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              MAX30100 Biometric Vitals
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                I2C: SDA 18 / SCL 19
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500">Photoplethysmography (PPG) Pulse Oximetry</p>
          </div>
        </div>

        {/* Sensor Ready Badge */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          {maxStatus === 'initialized' || hasHeartRate ? (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sensor Active
            </span>
          ) : maxStatus === 'not_detected' ? (
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> Not Detected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-zinc-500">
              <Activity className="w-3.5 h-3.5" /> {isConnected ? 'Sampling...' : 'Standby'}
            </span>
          )}
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Heart Rate Card */}
        <div className="glass-card-subtle p-4 rounded-xl border border-rose-500/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Heart
                className={`w-4 h-4 text-rose-500 ${hasHeartRate ? 'animate-heartbeat' : ''}`}
                fill="currentColor"
              />
              Heart Rate
            </span>
            {hrValue !== null && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getHrTier(hrValue).color}`}>
                {getHrTier(hrValue).label}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {hrValue !== null ? hrValue.toFixed(1) : '—'}
            </span>
            <span className="text-xs text-rose-400 font-semibold">BPM</span>
          </div>

          {/* Stats bar */}
          <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-white/[0.04]">
            <span>Min: {hrStats?.min ? `${hrStats.min.toFixed(0)}` : '—'}</span>
            <span>Avg: {hrStats?.avg ? `${hrStats.avg.toFixed(0)}` : '—'}</span>
            <span>Max: {hrStats?.max ? `${hrStats.max.toFixed(0)}` : '—'}</span>
          </div>
        </div>

        {/* SpO2 Card */}
        <div className="glass-card-subtle p-4 rounded-xl border border-cyan-500/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-cyan-400" />
              Blood Oxygen (SpO₂)
            </span>
            {spo2Value !== null && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getSpO2Tier(spo2Value).color}`}>
                {getSpO2Tier(spo2Value).label}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2 my-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {spo2Value !== null ? Math.round(spo2Value) : '—'}
            </span>
            <span className="text-xs text-cyan-400 font-semibold">% Saturation</span>
          </div>

          {/* Target Range Progress Bar */}
          <div className="space-y-1 pt-2 border-t border-white/[0.04]">
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, spo2Value ?? 0))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
              <span>90% Baseline</span>
              <span>100% Sat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer details */}
      <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500">
        <span>IR LED Current: 7.6 mA (Auto-calibrated)</span>
        <span>Update interval: 1,000 ms</span>
      </div>
    </div>
  );
}
