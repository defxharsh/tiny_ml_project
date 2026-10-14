import { Watch, Radio, Mic, Hand, ArrowRight, Fan, Heart, Droplets, Zap, Cpu } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';

export default function DeviceHero() {
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);
  const mode = useDashboardStore((s) => s.mode);
  const demoMode = useDashboardStore((s) => s.demoMode);
  const lastMessageTime = useDashboardStore((s) => s.lastMessageTime);
  const events = useDashboardStore((s) => s.events);
  const fanRelay = useDashboardStore((s) => s.fanRelay);
  const vitals = useDashboardStore((s) => s.vitals);
  const inference = useDashboardStore((s) => s.inference);
  const voiceInference = useDashboardStore((s) => s.voiceInference);
  const setConnectModalOpen = useDashboardStore((s) => s.setConnectModalOpen);

  const isConnected = connectionStatus === 'connected';

  // Latest command/gesture event
  const latestAction = [...events].reverse().find(
    (e) => e.type === 'voice_command' || e.type === 'gesture'
  );

  const lastUpdateStr = lastMessageTime
    ? `${Math.floor((Date.now() - lastMessageTime) / 1000)}s ago`
    : 'Never';

  const activeModel = mode === 'voice' ? voiceInference.modelName : inference.modelName;

  return (
    <div className="glass-card-elevated p-6 relative overflow-hidden">
      {/* Gradient accent background */}
      <div
        className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
        style={{
          background: isConnected
            ? fanRelay.fanOn
              ? 'radial-gradient(circle at top right, rgba(16,185,129,0.1), transparent 70%)'
              : 'radial-gradient(circle at top right, rgba(0,212,255,0.08), transparent 70%)'
            : 'radial-gradient(circle at top right, rgba(113,113,122,0.04), transparent 70%)',
        }}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
        {/* Left — Wristband visual + status */}
        <div className="flex items-center gap-5">
          {/* Wristband icon */}
          <div
            className={`relative flex-shrink-0 w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isConnected ? 'glow-ring-cyan' : ''
            }`}
            style={{
              background: isConnected
                ? 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(139,92,246,0.1))'
                : 'rgba(255,255,255,0.02)',
            }}
          >
            <Watch
              className={`w-10 h-10 ${
                isConnected ? 'text-accent-cyan wristband-glow' : 'text-zinc-700'
              }`}
              strokeWidth={1.2}
            />
            {isConnected && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-surface-900">
                <Radio className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-xl font-bold text-white">
                {isConnected ? 'ESP32 Smart Wristband' : 'Wristband Offline'}
              </h2>
              {demoMode && <span className="demo-badge">Simulated Stream</span>}
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                {activeModel}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
              <span className="flex items-center gap-1">
                {mode === 'voice' ? <Mic className="w-3.5 h-3.5" /> : <Hand className="w-3.5 h-3.5" />}
                <span className="capitalize text-zinc-300 font-medium">{mode} Mode</span>
              </span>
              <span>•</span>
              <span>{mode === 'voice' ? 'INMP441 (16kHz I2S)' : 'MPU-6500 (50Hz)'}</span>
              <span>•</span>
              <span>MAX30100 (PPG)</span>
              <span>•</span>
              <span>Updated: {lastUpdateStr}</span>
            </div>
          </div>
        </div>

        {/* Center/Right — Live Hardware Status Strip */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Fan Relay Pill */}
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all ${
              fanRelay.fanOn
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-white/[0.02] border-white/[0.05] text-zinc-400'
            }`}
          >
            <Fan
              className={`w-5 h-5 ${
                fanRelay.fanOn ? 'text-emerald-400 animate-fan-spin' : 'text-zinc-500'
              }`}
            />
            <div>
              <div className="text-[10px] uppercase font-semibold text-zinc-500 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> Fan Relay (GPIO 13)
              </div>
              <div className="text-xs font-bold font-mono">
                {fanRelay.fanOn ? 'ACTIVE • ON' : 'STANDBY • OFF'}
              </div>
            </div>
          </div>

          {/* Vitals Quick Pill */}
          <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl border border-white/[0.05] bg-white/[0.02]">
            <div className="flex items-center gap-1.5">
              <Heart
                className={`w-4 h-4 text-rose-500 ${
                  vitals.heartRate ? 'animate-heartbeat' : ''
                }`}
                fill="currentColor"
              />
              <div>
                <div className="text-[9px] uppercase font-semibold text-zinc-500">Heart Rate</div>
                <div className="text-xs font-bold text-white font-mono">
                  {vitals.heartRate ? `${vitals.heartRate.toFixed(1)} BPM` : '—'}
                </div>
              </div>
            </div>
            <div className="w-[1px] h-6 bg-white/[0.06]" />
            <div className="flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[9px] uppercase font-semibold text-zinc-500">SpO₂ Oxygen</div>
                <div className="text-xs font-bold text-white font-mono">
                  {vitals.spO2 ? `${Math.round(vitals.spO2)}%` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Connect button if not connected */}
          {!isConnected && (
            <button
              onClick={() => setConnectModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-4 font-bold shadow-[0_0_15px_rgba(0,212,255,0.3)]"
            >
              🔌 Connect ESP32 (COM Port) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
