import { Mic, Cpu, CheckCircle2, AlertTriangle, Layers, Radio, Volume2, ShieldAlert } from 'lucide-react';
import { useDashboardStore } from '../store/dashboardStore';

const VOICE_CONFIG: Record<
  string,
  { label: string; icon: string; desc: string; color: string; badgeColor: string }
> = {
  fan_on: {
    label: 'Fan ON',
    icon: '🌀',
    desc: 'Triggers Relay GPIO 13 (LOW) to power ON fan',
    color: '#10b981',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  stop: {
    label: 'Stop Fan',
    icon: '🛑',
    desc: 'Deactivates relay (GPIO 13 HIGH) and shuts OFF fan',
    color: '#ef4444',
    badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
  noise: {
    label: 'Background Noise',
    icon: '🌊',
    desc: 'Ambient audio filtered out, fan state unchanged',
    color: '#06b6d4',
    badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  },
  unknown: {
    label: 'Unknown Command',
    icon: '❓',
    desc: 'Unrecognized acoustic pattern, fan state unchanged',
    color: '#8b5cf6',
    badgeColor: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  },
};

export default function VoicePanel() {
  const events = useDashboardStore((s) => s.events);
  const stats = useDashboardStore((s) => s.stats);
  const mode = useDashboardStore((s) => s.mode);
  const voiceInference = useDashboardStore((s) => s.voiceInference);
  const connectionStatus = useDashboardStore((s) => s.connectionStatus);

  if (mode !== 'voice') return null;

  const voiceEvents = events.filter((e) => e.type === 'voice_command');
  const latestEvent = voiceEvents[voiceEvents.length - 1];

  const detected = voiceInference.latestDetected || latestEvent?.label || null;
  const confidence = voiceInference.latestConfidence ?? latestEvent?.confidence ?? null;
  const isConfidencePass = confidence !== null && confidence >= voiceInference.confidenceThreshold;

  const predictions = voiceInference.classPredictions;
  const classes =
    voiceInference.classes.length > 0
      ? voiceInference.classes
      : ['fan_on', 'stop', 'noise', 'unknown'];

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute top-0 right-0 w-64 h-64 pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.25), transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center text-accent-cyan">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Voice Inferencing
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {voiceInference.modelName}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-500">
              Edge Impulse TinyML • INMP441 ({voiceInference.sampleRate ?? 16000} Hz Mono)
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-zinc-300 font-mono">
            {stats.totalCommands}
          </span>
          <span className="text-[10px] text-zinc-500 block">Total Commands</span>
        </div>
      </div>

      {/* Live Recording / Inferencing Status Banners */}
      {voiceInference.isRecording ? (
        <div className="mb-4 py-2.5 px-3.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-between text-xs text-accent-cyan animate-pulse">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 animate-ping text-accent-cyan" />
            <span className="font-semibold">Microphone Recording (INMP441)... Speak your command!</span>
          </div>
          {/* Animated sound wave bars */}
          <div className="flex items-center gap-1">
            <span className="w-1 h-3 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-5 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-2 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="w-1 h-4 bg-accent-cyan rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
          </div>
        </div>
      ) : voiceInference.isInferencing ? (
        <div className="mb-4 py-2.5 px-3.5 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center gap-2.5 text-xs text-violet-300 animate-pulse">
          <Cpu className="w-4 h-4 animate-spin text-accent-violet" />
          <span>Computing MFCC spectrogram & running Edge Impulse classifier...</span>
        </div>
      ) : null}

      {/* Hero Detected Voice Command */}
      {detected ? (
        <div
          className="mb-4 p-4 rounded-xl border border-white/[0.06] relative overflow-hidden"
          style={{
            background:
              detected === 'fan_on'
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(0, 212, 255, 0.05))'
                : detected === 'stop'
                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(139, 92, 246, 0.05))'
                : detected === 'noise'
                ? 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(255, 255, 255, 0.02))'
                : 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(255, 255, 255, 0.02))',
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl filter drop-shadow-md">
                {VOICE_CONFIG[detected]?.icon || '🎙'}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-extrabold text-white">
                    {VOICE_CONFIG[detected]?.label || detected}
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
                  {VOICE_CONFIG[detected]?.desc || 'ESP32 Edge Impulse voice command detected'}
                </p>
              </div>
            </div>

            {/* Action pill */}
            <div className="text-right">
              {detected === 'noise' || detected === 'unknown' ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-semibold bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.06]">
                  <Volume2 className="w-3.5 h-3.5" /> Fan Unchanged
                </span>
              ) : isConfidencePass ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Action Executed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" /> Filtered (&lt;70%)
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-5 rounded-xl border border-white/[0.04] bg-white/[0.01] text-center">
          <p className="text-sm text-zinc-500">
            {connectionStatus === 'connected'
              ? 'Listening for voice commands (fan_on, stop, noise)...'
              : 'Connect ESP32 or launch simulated stream to test voice commands'}
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
            Threshold: ≥ {(voiceInference.confidenceThreshold * 100).toFixed(0)}%
          </span>
        </div>

        <div className="space-y-2.5">
          {classes.map((cls) => {
            const val = predictions[cls] ?? 0;
            const pct = Math.min(100, Math.max(0, val * 100));
            const isWinner = detected === cls;
            const isAboveThreshold = val >= voiceInference.confidenceThreshold;

            return (
              <div key={cls} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                    <span>{VOICE_CONFIG[cls]?.icon || '•'}</span>
                    <span className="capitalize">{VOICE_CONFIG[cls]?.label || cls}</span>
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

                {/* Progress bar with threshold indicator at 70% */}
                <div className="relative w-full h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: VOICE_CONFIG[cls]?.color || '#00d4ff',
                    }}
                  />
                  {/* Threshold vertical line indicator at 70% */}
                  <div
                    className="absolute top-0 bottom-0 w-[2px] bg-white/40 z-10"
                    style={{ left: '70%' }}
                    title="Confidence Threshold (70%)"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hardware Telemetry Strip */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="text-[9px] uppercase font-semibold text-zinc-500">I2S Interface</div>
          <div className="text-xs font-mono font-bold text-zinc-300">SCK:33 WS:25 SD:32</div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="text-[9px] uppercase font-semibold text-zinc-500">Sample Rate</div>
          <div className="text-xs font-mono font-bold text-cyan-400">
            {voiceInference.sampleRate ? `${voiceInference.sampleRate} Hz` : '16000 Hz'}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="text-[9px] uppercase font-semibold text-zinc-500">Window Count</div>
          <div className="text-xs font-mono font-bold text-zinc-300">
            {voiceInference.sampleCount ? `${voiceInference.sampleCount} pts` : '16000 pts'}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="text-[9px] uppercase font-semibold text-zinc-500">Relay Output</div>
          <div className="text-xs font-mono font-bold text-emerald-400">GPIO 13 (Fan)</div>
        </div>
      </div>

      {/* Recent History Table */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Voice Command Log
        </p>
        <div className="space-y-1 max-h-36 overflow-y-auto">
          {voiceEvents.length === 0 ? (
            <p className="text-xs text-zinc-600 text-center py-2">No voice commands recorded yet</p>
          ) : (
            [...voiceEvents]
              .reverse()
              .slice(0, 15)
              .map((e) => {
                const confVal = e.confidence ?? null;
                const isPass = confVal !== null ? confVal >= 0.70 : true;

                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white/[0.01] hover:bg-white/[0.03] transition-colors border border-white/[0.02]"
                  >
                    <div className="flex items-center gap-2">
                      <span>{VOICE_CONFIG[e.label]?.icon || '🎙'}</span>
                      <span className="text-xs text-zinc-300 font-medium capitalize">
                        {VOICE_CONFIG[e.label]?.label || e.label}
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
