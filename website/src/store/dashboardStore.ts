/**
 * Dashboard Store — Zustand-based centralized state for the dashboard.
 *
 * Manages connection state, sensor history, events, raw messages,
 * session statistics, and UI state. All mutations go through actions
 * to avoid unnecessary React re-renders.
 */

import { create } from 'zustand';
import type {
  DashboardState,
  OperatingMode,
  ConnectionStatus,
  SensorReading,
  DeviceEvent,
  SerialMessage,
  SessionStats,
  SensorStats,
  ParsedLine,
  VoiceInference,
} from '../types';

let eventCounter = 0;
function nextEventId(): string {
  return `evt-${++eventCounter}-${Date.now()}`;
}

const initialStats: SessionStats = {
  startTime: Date.now(),
  totalMessages: 0,
  validMessages: 0,
  totalCommands: 0,
  totalGestures: 0,
  messagesPerMinute: 0,
  sensorStats: {},
};
interface DashboardActions {
  /* Connection */
  setConnectionStatus: (status: ConnectionStatus) => void;
  setBaudRate: (rate: number) => void;
  setMode: (mode: OperatingMode) => void;
  setDemoMode: (enabled: boolean) => void;

  /* Hardware Control */
  setFanState: (on: boolean) => void;
  triggerManualFanToggle: () => void;

  /* Data ingestion */
  ingestParsedLine: (parsed: ParsedLine, rawLine: string) => void;

  /* UI */
  toggleDisplayPaused: () => void;
  setSettingsOpen: (open: boolean) => void;
  setConnectModalOpen: (open: boolean) => void;

  /* Maintenance */
  clearEvents: () => void;
  clearRawMessages: () => void;
  resetSession: () => void;
  setMaxHistoryPoints: (n: number) => void;
}

const initialFanRelay = {
  fanOn: false,
  pin: 13,
  lastAction: null as string | null,
  lastActionTime: null as number | null,
  totalToggles: 0,
};

const initialVitals = {
  heartRate: null as number | null,
  spO2: null as number | null,
  lastUpdated: null as number | null,
};

const initialInference = {
  modelName: 'real_gesture_data',
  classes: ['fan_on', 'fan_off', 'idle'],
  confidenceThreshold: 0.65,
  classPredictions: { fan_on: 0, fan_off: 0, idle: 0 } as Record<string, number>,
  latestDetected: null as string | null,
  latestConfidence: null as number | null,
  isCollecting: false,
  mpuStatus: 'ok' as const,
  max30100Status: 'unknown' as const,
};

const initialVoiceInference: VoiceInference = {
  modelName: 'voice_train',
  classes: ['fan_on', 'stop', 'noise', 'unknown'],
  confidenceThreshold: 0.70,
  classPredictions: { fan_on: 0, stop: 0, noise: 0, unknown: 0 },
  latestDetected: null,
  latestConfidence: null,
  isRecording: false,
  isInferencing: false,
  micStatus: 'unknown',
  max30100Status: 'unknown',
  sampleRate: 16000,
  sampleCount: 16000,
};

export const useDashboardStore = create<DashboardState & DashboardActions>((set, get) => ({
  /* ── Initial state ───────────────────────────────────── */
  connectionStatus: 'disconnected',
  baudRate: 115200,
  mode: 'gesture',
  demoMode: false,
  lastMessageTime: null,

  /* Hardware State */
  fanRelay: { ...initialFanRelay },
  vitals: { ...initialVitals },
  inference: { ...initialInference },
  voiceInference: { ...initialVoiceInference },

  sensorHistory: {},
  events: [],
  rawMessages: [],
  stats: { ...initialStats },

  displayPaused: false,
  settingsOpen: false,
  connectModalOpen: false,

  maxHistoryPoints: 200,
  maxEvents: 500,
  maxRawMessages: 1000,

  /* ── Connection actions ──────────────────────────────── */
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setBaudRate: (rate) => set({ baudRate: rate }),
  setMode: (mode) => set({ mode }),
  setDemoMode: (enabled) => set({ demoMode: enabled }),

  /* ── Hardware actions ────────────────────────────────── */
  setFanState: (on) => {
    const now = Date.now();
    set((s) => ({
      fanRelay: {
        ...s.fanRelay,
        fanOn: on,
        lastAction: on ? 'MANUAL: FAN ON' : 'MANUAL: FAN OFF',
        lastActionTime: now,
        totalToggles: s.fanRelay.totalToggles + 1,
      },
    }));
  },
  triggerManualFanToggle: () => {
    const state = get();
    state.setFanState(!state.fanRelay.fanOn);
  },

  /* ── Data ingestion ──────────────────────────────────── */
  ingestParsedLine: (parsed, rawLine) => {
    const now = Date.now();
    const state = get();

    const newRawMessage: SerialMessage = {
      timestamp: now,
      raw: rawLine,
      parsed: !!(parsed.sensors || parsed.event || parsed.fanState !== undefined || parsed.vitals),
    };

    // Update Relay / Fan state
    let newFanRelay = state.fanRelay;
    if (parsed.fanState !== undefined) {
      newFanRelay = {
        ...state.fanRelay,
        fanOn: parsed.fanState,
        lastAction: parsed.fanState ? 'FAN ON' : 'FAN OFF',
        lastActionTime: now,
        totalToggles: state.fanRelay.totalToggles + 1,
      };
    }

    // Update Vitals (MAX30100)
    let newVitals = state.vitals;
    if (parsed.vitals) {
      newVitals = {
        heartRate: parsed.vitals.heartRate,
        spO2: parsed.vitals.spO2,
        lastUpdated: now,
      };
    }

    // Update Gesture Inference & Model status
    let newInference = { ...state.inference };
    if (parsed.prediction && state.mode === 'gesture') {
      newInference.classPredictions = {
        ...newInference.classPredictions,
        [parsed.prediction.class]: parsed.prediction.value,
      };
    }
    if (parsed.detected && state.mode === 'gesture') {
      newInference.latestDetected = parsed.detected.gesture;
      if (parsed.detected.confidence !== undefined) {
        newInference.latestConfidence = parsed.detected.confidence;
      }
      newInference.isCollecting = false;
    }
    if (parsed.confidence !== undefined && state.mode === 'gesture') {
      newInference.latestConfidence = parsed.confidence;
    }
    if (parsed.isCollecting !== undefined) {
      newInference.isCollecting = parsed.isCollecting;
    }
    if (parsed.mpuStatus) {
      newInference.mpuStatus = parsed.mpuStatus;
    }
    if (parsed.max30100Status) {
      newInference.max30100Status = parsed.max30100Status;
    }
    if (parsed.systemStatus?.model && state.mode === 'gesture') {
      newInference.modelName = parsed.systemStatus.model;
    }
    if (parsed.systemStatus?.classes && state.mode === 'gesture') {
      newInference.classes = parsed.systemStatus.classes;
    }

    // Update Voice Inference & Model status
    let newVoiceInference = { ...state.voiceInference };
    if (parsed.prediction && state.mode === 'voice') {
      newVoiceInference.classPredictions = {
        ...newVoiceInference.classPredictions,
        [parsed.prediction.class]: parsed.prediction.value,
      };
    }
    if (parsed.voiceDetected) {
      newVoiceInference.latestDetected = parsed.voiceDetected.command;
      if (parsed.voiceDetected.confidence !== undefined) {
        newVoiceInference.latestConfidence = parsed.voiceDetected.confidence;
      }
      newVoiceInference.isRecording = false;
      newVoiceInference.isInferencing = false;
    } else if (parsed.detected && state.mode === 'voice') {
      newVoiceInference.latestDetected = parsed.detected.gesture;
      if (parsed.detected.confidence !== undefined) {
        newVoiceInference.latestConfidence = parsed.detected.confidence;
      }
      newVoiceInference.isRecording = false;
      newVoiceInference.isInferencing = false;
    }
    if (parsed.confidence !== undefined && state.mode === 'voice') {
      newVoiceInference.latestConfidence = parsed.confidence;
    }
    if (parsed.isRecording !== undefined) {
      newVoiceInference.isRecording = parsed.isRecording;
      if (parsed.isRecording) newVoiceInference.isInferencing = false;
    }
    if (parsed.isInferencing !== undefined) {
      newVoiceInference.isInferencing = parsed.isInferencing;
      if (parsed.isInferencing) newVoiceInference.isRecording = false;
    }
    if (parsed.micStatus) {
      newVoiceInference.micStatus = parsed.micStatus;
    }
    if (parsed.max30100Status) {
      newVoiceInference.max30100Status = parsed.max30100Status;
    }
    if (parsed.sampleRate) {
      newVoiceInference.sampleRate = parsed.sampleRate;
    }
    if (parsed.sampleCount) {
      newVoiceInference.sampleCount = parsed.sampleCount;
    }
    if (parsed.systemStatus?.model && state.mode === 'voice') {
      newVoiceInference.modelName = parsed.systemStatus.model;
    }
    if (parsed.systemStatus?.classes && state.mode === 'voice') {
      newVoiceInference.classes = parsed.systemStatus.classes;
    }

    // Build updated sensor history
    const newSensorHistory = { ...state.sensorHistory };
    if (parsed.sensors) {
      for (const s of parsed.sensors) {
        const reading: SensorReading = {
          timestamp: now,
          name: s.name,
          value: s.value,
          unit: s.unit,
        };
        const arr = [...(newSensorHistory[s.name] || []), reading];
        // Trim to max
        newSensorHistory[s.name] = arr.length > state.maxHistoryPoints
          ? arr.slice(arr.length - state.maxHistoryPoints)
          : arr;
      }
    }

    // Build updated events
    let newEvents = state.events;
    if (parsed.event) {
      const evt: DeviceEvent = {
        id: nextEventId(),
        timestamp: now,
        type: parsed.event.type,
        label: parsed.event.label,
        raw: rawLine,
        confidence:
          parsed.event.confidence ??
          (parsed.event.type === 'gesture'
            ? newInference.latestConfidence ?? undefined
            : parsed.event.type === 'voice_command'
            ? newVoiceInference.latestConfidence ?? undefined
            : undefined),
        meta: parsed.event.meta,
      };
      newEvents = [...state.events, evt];
      if (newEvents.length > state.maxEvents) {
        newEvents = newEvents.slice(newEvents.length - state.maxEvents);
      }
    }

    // Trim raw messages
    let rawMessages = [...state.rawMessages, newRawMessage];
    if (rawMessages.length > state.maxRawMessages) {
      rawMessages = rawMessages.slice(rawMessages.length - state.maxRawMessages);
    }

    // Update stats
    const newStats = computeStats(state.stats, parsed, newSensorHistory, now);

    set({
      lastMessageTime: now,
      fanRelay: newFanRelay,
      vitals: newVitals,
      inference: newInference,
      voiceInference: newVoiceInference,
      sensorHistory: newSensorHistory,
      events: newEvents,
      rawMessages,
      stats: newStats,
    });
  },

  /* ── UI actions ──────────────────────────────────────── */
  toggleDisplayPaused: () => set((s) => ({ displayPaused: !s.displayPaused })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setConnectModalOpen: (open) => set({ connectModalOpen: open }),

  /* ── Maintenance actions ─────────────────────────────── */
  clearEvents: () => set({ events: [] }),
  clearRawMessages: () => set({ rawMessages: [] }),
  resetSession: () =>
    set({
      fanRelay: { ...initialFanRelay },
      vitals: { ...initialVitals },
      inference: { ...initialInference },
      voiceInference: { ...initialVoiceInference },
      sensorHistory: {},
      events: [],
      rawMessages: [],
      lastMessageTime: null,
      stats: { ...initialStats, startTime: Date.now() },
    }),
  setMaxHistoryPoints: (n) => set({ maxHistoryPoints: n }),
}));

/* ── Stats computation ─────────────────────────────────── */
function computeStats(
  prev: SessionStats,
  parsed: ParsedLine,
  sensorHistory: Record<string, SensorReading[]>,
  now: number,
): SessionStats {
  const totalMessages = prev.totalMessages + 1;
  const validMessages = prev.validMessages + (parsed.sensors || parsed.event ? 1 : 0);
  const totalCommands = prev.totalCommands + (parsed.event?.type === 'voice_command' ? 1 : 0);
  const totalGestures = prev.totalGestures + (parsed.event?.type === 'gesture' ? 1 : 0);

  const elapsedMinutes = Math.max((now - prev.startTime) / 60000, 0.01);
  const messagesPerMinute = Math.round((totalMessages / elapsedMinutes) * 10) / 10;

  // Sensor stats
  const sensorStats: Record<string, SensorStats> = {};
  for (const [name, readings] of Object.entries(sensorHistory)) {
    if (readings.length === 0) continue;
    const values = readings.map((r) => r.value);
    sensorStats[name] = {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
      current: values[values.length - 1],
      count: values.length,
    };
  }

  return {
    startTime: prev.startTime,
    totalMessages,
    validMessages,
    totalCommands,
    totalGestures,
    messagesPerMinute,
    sensorStats,
  };
}
