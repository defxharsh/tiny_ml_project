import { useState } from 'react';
import { X, Usb, Play, Zap } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';
import { SerialManager } from '../lib/serialManager';
import { parseVoiceLine, parseGestureLine } from '../lib/parser';
import { startDemo, stopDemo } from '../lib/demoMode';
import type { OperatingMode } from '../types';

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600];

interface Props {
  serialManager: React.MutableRefObject<SerialManager | null>;
}

export default function ConnectModal({ serialManager }: Props) {
  const open = useDashboardStore((s) => s.connectModalOpen);
  const setOpen = useDashboardStore((s) => s.setConnectModalOpen);
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);
  const baudRate = useDashboardStore((s) => s.baudRate);
  const setBaudRate = useDashboardStore((s) => s.setBaudRate);
  const mode = useDashboardStore((s) => s.mode);
  const setMode = useDashboardStore((s) => s.setMode);
  const setConnectionStatus = useDashboardStore((s) => s.setConnectionStatus);
  const ingestParsedLine = useDashboardStore((s) => s.ingestParsedLine);
  const setDemoMode = useDashboardStore((s) => s.setDemoMode);
  const demoMode = useDashboardStore((s) => s.demoMode);
  const resetSession = useDashboardStore((s) => s.resetSession);

  const [error, setError] = useState<string | null>(null);
  const [selectedBaud, setSelectedBaud] = useState(baudRate);
  const [selectedMode, setSelectedMode] = useState<OperatingMode>(mode);

  if (!open) return null;

  const isConnected = connectionStatus === 'connected';

  const handleConnect = async () => {
    setError(null);
    resetSession();
    setBaudRate(selectedBaud);
    setMode(selectedMode);
    setConnectionStatus('connecting');

    const onLine = (line: string) => {
      const parser = useDashboardStore.getState().mode === 'voice' ? parseVoiceLine : parseGestureLine;
      const parsed = parser(line);
      ingestParsedLine(parsed, line);
    };

    const onStatus = (connected: boolean) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
      if (!connected) {
        ingestParsedLine(
          { event: { type: 'error', label: 'Device disconnected' } },
          '[SYSTEM] Device disconnected'
        );
      }
    };

    const mgr = new SerialManager(onLine, onStatus);
    serialManager.current = mgr;

    try {
      await mgr.connect(selectedBaud);
      setDemoMode(false);
      ingestParsedLine(
        { event: { type: 'info', label: `Connected at ${selectedBaud} baud (${selectedMode} mode)` } },
        `[SYSTEM] Connected at ${selectedBaud} baud`
      );
      setOpen(false);
    } catch (err: any) {
      setError(err.message);
      setConnectionStatus('error');
      serialManager.current = null;
    }
  };

  const handleDisconnect = async () => {
    setError(null);
    if (demoMode) {
      stopDemo();
      setDemoMode(false);
      setConnectionStatus('disconnected');
    } else if (serialManager.current) {
      await serialManager.current.disconnect();
      serialManager.current = null;
    }
    ingestParsedLine(
      { event: { type: 'info', label: 'Session ended by user' } },
      '[SYSTEM] Disconnected'
    );
  };

  const handleStartDemo = () => {
    setError(null);
    resetSession();
    setMode(selectedMode);
    setDemoMode(true);
    startDemo();
    setOpen(false);
  };

  const webSerialSupported = SerialManager.isSupported();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={() => setOpen(false)}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative glass-card-elevated p-6 w-full max-w-md mx-4 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(139,92,246,0.15))' }}>
              <Usb className="w-5 h-5 text-accent-cyan" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Connect Wristband</h2>
              <p className="text-xs text-zinc-500">Web Serial API (USB)</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-zinc-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Browser support warning */}
        {!webSerialSupported && (
          <div className="mb-4 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs">
            ⚠ Web Serial API is not supported. Use <strong>Chrome 89+</strong> or <strong>Edge 89+</strong>.
            You can still use Demo Mode below.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Mode selector */}
        <div className="mb-4">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
            Operating Mode
          </label>
          <div className="mode-toggle">
            <div
              className="mode-toggle-indicator"
              style={{ transform: selectedMode === 'gesture' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            <button
              className={`mode-toggle-btn flex-1 text-center ${selectedMode === 'voice' ? 'active' : ''}`}
              onClick={() => setSelectedMode('voice')}
            >
              🎙 Voice
            </button>
            <button
              className={`mode-toggle-btn flex-1 text-center ${selectedMode === 'gesture' ? 'active' : ''}`}
              onClick={() => setSelectedMode('gesture')}
            >
              ✋ Gesture
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 mt-1.5">
            Select the mode matching the firmware currently running on your ESP32.
          </p>
        </div>

        {/* Baud rate */}
        <div className="mb-6">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">
            Baud Rate
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {BAUD_RATES.map((rate) => (
              <button
                key={rate}
                className={`py-1.5 rounded-lg text-xs font-mono transition-all border ${
                  selectedBaud === rate
                    ? 'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan'
                    : 'border-white/[0.04] text-zinc-500 hover:border-white/10 hover:text-zinc-300'
                }`}
                onClick={() => setSelectedBaud(rate)}
              >
                {rate >= 1000 ? `${rate / 1000}k` : rate}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {isConnected ? (
            <button onClick={handleDisconnect} className="btn-danger flex items-center justify-center gap-2">
              <WifiOffIcon /> Disconnect Device
            </button>
          ) : (
            <>
              <button
                onClick={handleConnect}
                disabled={!webSerialSupported}
                className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5 font-bold shadow-[0_0_20px_rgba(0,212,255,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap className="w-4 h-4" /> 🔌 Select & Connect ESP32 (COM Port)
              </button>
              <button
                onClick={handleStartDemo}
                className="btn-secondary flex items-center justify-center gap-2 text-xs py-2 text-zinc-500 hover:text-zinc-300"
              >
                <Play className="w-3.5 h-3.5" /> Or launch synthetic demo stream
              </button>
            </>
          )}
        </div>

        {/* Footnote */}
        <div className="mt-4 p-2.5 rounded-lg bg-surface-950/60 border border-white/[0.04] text-[10px] text-zinc-400 space-y-1">
          <p className="font-semibold text-accent-cyan flex items-center gap-1">
            ⚡ Live Hardware Instructions:
          </p>
          <p>
            1. <strong>Close Arduino IDE Serial Monitor</strong> before connecting (prevents "port in use" lock).
          </p>
          <p>
            2. Click <strong>Select & Connect ESP32</strong> and choose your Silicon Labs / CH340 / USB Serial port.
          </p>
          <p>
            3. Baud rate is pre-set to <strong>115200</strong> matching <code className="text-zinc-300">Serial.begin(115200)</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

function WifiOffIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M8.5 16.5a5 5 0 017 0" />
      <path d="M2 8.82a15 15 0 014.17-2.65" />
      <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
      <path d="M16.85 11.25a10 10 0 012.22 1.68" />
      <path d="M5 12.859a10 10 0 015.17-2.69" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}
