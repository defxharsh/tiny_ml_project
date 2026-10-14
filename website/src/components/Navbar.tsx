import { useEffect, useState } from 'react';
import { Watch, Wifi, WifiOff, Settings, Clock, Activity } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';

export default function Navbar() {
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);
  const mode = useDashboardStore((s) => s.mode);
  const demoMode = useDashboardStore((s) => s.demoMode);
  const stats = useDashboardStore((s) => s.stats);
  const setSettingsOpen = useDashboardStore((s) => s.setSettingsOpen);
  const setConnectModalOpen = useDashboardStore((s) => s.setConnectModalOpen);

  const [clock, setClock] = useState('');
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour12: false }));
      if (connectionStatus === 'connected') {
        const diff = Math.floor((now.getTime() - stats.startTime) / 1000);
        const h = String(Math.floor(diff / 3600)).padStart(2, '0');
        const m = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const s = String(diff % 60).padStart(2, '0');
        setElapsed(`${h}:${m}:${s}`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [connectionStatus, stats.startTime]);

  const statusDotClass =
    connectionStatus === 'connected'
      ? 'status-dot-connected'
      : connectionStatus === 'connecting'
        ? 'status-dot-connecting'
        : connectionStatus === 'error'
          ? 'status-dot-error'
          : 'status-dot-disconnected';

  const statusLabel =
    connectionStatus === 'connected'
      ? 'Connected'
      : connectionStatus === 'connecting'
        ? 'Connecting…'
        : connectionStatus === 'error'
          ? 'Error'
          : 'Disconnected';

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.04]" style={{
      background: 'rgba(6, 6, 11, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left — Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <Watch className="w-6 h-6 text-accent-cyan" strokeWidth={1.5} />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-violet animate-pulse" />
          </div>
          <h1 className="text-base font-bold tracking-tight text-white hidden sm:block">
            Tiny<span className="text-accent-cyan">Gest</span>
          </h1>
          {demoMode && <span className="demo-badge">Demo</span>}
        </div>

        {/* Center — Status pills */}
        <div className="flex items-center gap-3 text-xs">
          {/* Connection status button */}
          {connectionStatus === 'connected' ? (
            <button
              onClick={() => setConnectModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
            >
              <span className={`status-dot ${statusDotClass}`} />
              <span className="font-semibold">{demoMode ? 'Simulated Stream' : 'Live ESP32 Serial'}</span>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          ) : (
            <button
              onClick={() => setConnectModalOpen(true)}
              className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs cursor-pointer shadow-[0_0_15px_rgba(0,212,255,0.25)]"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Connect ESP32 (USB)</span>
            </button>
          )}

          {/* Mode pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06]"
               style={{ background: 'rgba(255,255,255,0.03)' }}>
            <Activity className="w-3.5 h-3.5 text-accent-violet" />
            <span className="text-zinc-400 font-medium capitalize">{mode} Mode</span>
          </div>

          {/* Session timer */}
          {connectionStatus === 'connected' && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.06]"
                 style={{ background: 'rgba(255,255,255,0.03)' }}>
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400 font-mono text-[11px]">{elapsed}</span>
            </div>
          )}
        </div>

        {/* Right — Clock & Settings */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-600 hidden sm:block">{clock}</span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-zinc-500 hover:text-zinc-300"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
