import { Fan, Zap, Cpu, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';

export default function FanRelayCard() {
  const fanRelay = useDashboardStore((s) => s.fanRelay);
  const inference = useDashboardStore((s) => s.inference);
  const voiceInference = useDashboardStore((s) => s.voiceInference);
  const mode = useDashboardStore((s) => s.mode);
  const isOn = fanRelay.fanOn;

  const lastActionTimeStr = fanRelay.lastActionTime
    ? new Date(fanRelay.lastActionTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'None yet';

  return (
    <div
      className={`glass-card p-5 transition-all duration-300 relative overflow-hidden ${
        isOn ? 'glow-relay-active' : ''
      }`}
    >
      {/* Background ambient gradient */}
      <div
        className="absolute top-0 right-0 w-64 h-64 pointer-events-none transition-opacity duration-500"
        style={{
          background: isOn
            ? 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.15), transparent 70%)'
            : 'radial-gradient(circle at top right, rgba(113, 113, 122, 0.05), transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              isOn
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/[0.03] text-zinc-500 border border-white/[0.04]'
            }`}
          >
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Relay & Fan Controller
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                GPIO 13
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500">Active-LOW Relay Trigger</p>
          </div>
        </div>

        {/* State Pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${
            isOn
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'bg-zinc-800/60 text-zinc-400 border-white/[0.06]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isOn ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
            }`}
          />
          {isOn ? 'Fan ON' : 'Fan OFF'}
        </div>
      </div>

      {/* Fan Visual & Status Center */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-3 items-stretch">
        {/* Animated Fan Graphic */}
        <div
          className="glass-card-subtle p-4 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden"
          style={{
            background: isOn
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.05))'
              : 'rgba(255, 255, 255, 0.01)',
          }}
        >
          <div className="relative my-2">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all duration-500 ${
                isOn
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'border-white/[0.06] bg-white/[0.02] text-zinc-600'
              }`}
            >
              <Fan
                className={`w-12 h-12 transition-transform ${
                  isOn ? 'animate-fan-spin' : ''
                }`}
              />
            </div>
            {isOn && (
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded bg-emerald-500 text-[9px] font-bold text-black uppercase tracking-wider">
                RUN
              </div>
            )}
          </div>

          <p className="text-xs font-semibold text-white mt-1">
            {isOn ? 'Appliance Active (LOW)' : 'Appliance Inactive (HIGH)'}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {isOn ? 'Fan blades spinning • 100% duty' : 'Standby mode • 0W draw'}
          </p>
        </div>

        {/* Action Details */}
        <div className="glass-card-subtle p-4 rounded-xl flex flex-col justify-center space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" /> Last Action
            </span>
            <span className="font-mono text-zinc-300">{lastActionTimeStr}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-400" /> Total Toggles
            </span>
            <span className="font-mono text-zinc-300 font-bold">
              {fanRelay.totalToggles}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-zinc-400" /> Hardware State
            </span>
            <span
              className={`font-mono text-[11px] font-bold ${
                isOn ? 'text-emerald-400' : 'text-zinc-400'
              }`}
            >
              {isOn ? 'PIN 13 = LOW (0V)' : 'PIN 13 = HIGH (3.3V)'}
            </span>
          </div>
        </div>
      </div>

      {/* Trigger info banner */}
      <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          {(mode === 'gesture' && (inference.latestDetected === 'fan_on' || inference.latestDetected === 'fan_off')) ||
          (mode === 'voice' && (voiceInference.latestDetected === 'fan_on' || voiceInference.latestDetected === 'stop')) ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span>
            {fanRelay.lastAction
              ? `Status: ${fanRelay.lastAction}`
              : mode === 'voice'
              ? 'Awaiting voice command (fan_on / stop)'
              : 'Awaiting gesture input (fan_on / fan_off)'}
          </span>
        </span>
        <span className="text-[10px] text-zinc-600">
          Threshold: ≥ {mode === 'voice' ? '70%' : '65%'}
        </span>
      </div>
    </div>
  );
}
