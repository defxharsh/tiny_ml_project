/* ── Operating Modes ─────────────────────────────────── */
export type OperatingMode = 'voice' | 'gesture';

/* ── Sensor Reading ──────────────────────────────────── */
export interface SensorReading {
  timestamp: number;
  name: string;
  value: number;
  unit?: string;
}

/* ── Event from Serial ───────────────────────────────── */
export type EventType = 'voice_command' | 'gesture' | 'status' | 'error' | 'info' | 'sensor';

export interface DeviceEvent {
  id: string;
  timestamp: number;
  type: EventType;
  label: string;
  raw: string;
  confidence?: number;
  meta?: Record<string, string | number>;
}

/* ── Raw Serial Message ──────────────────────────────── */
export interface SerialMessage {
  timestamp: number;
  raw: string;
  parsed: boolean;
}

/* ── Sensor Statistics ───────────────────────────────── */
export interface SensorStats {
  min: number;
  max: number;
  avg: number;
  current: number;
  count: number;
}

/* ── Hardware Specific State (gesture_relay_final) ───── */
export interface VitalsData {
  heartRate: number | null;
  spO2: number | null;
  lastUpdated: number | null;
}

export interface RelayData {
  fanOn: boolean;
  pin: number;
  lastAction: string | null;
  lastActionTime: number | null;
  totalToggles: number;
}

export interface GestureInference {
  modelName: string;
  classes: string[];
  confidenceThreshold: number;
  classPredictions: Record<string, number>;
  latestDetected: string | null;
  latestConfidence: number | null;
  isCollecting: boolean;
  mpuStatus: 'ok' | 'error' | 'unknown';
  max30100Status: 'initialized' | 'not_detected' | 'unknown';
}

export interface VoiceInference {
  modelName: string;
  classes: string[];
  confidenceThreshold: number;
  classPredictions: Record<string, number>;
  latestDetected: string | null;
  latestConfidence: number | null;
  isRecording: boolean;
  isInferencing: boolean;
  micStatus: 'ok' | 'error' | 'unknown';
  max30100Status: 'initialized' | 'not_detected' | 'unknown';
  sampleRate: number | null;
  sampleCount: number | null;
}

/* ── Session Statistics ──────────────────────────────── */
export interface SessionStats {
  startTime: number;
  totalMessages: number;
  validMessages: number;
  totalCommands: number;
  totalGestures: number;
  messagesPerMinute: number;
  sensorStats: Record<string, SensorStats>;
}

/* ── Connection State ────────────────────────────────── */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/* ── Dashboard State ─────────────────────────────────── */
export interface DashboardState {
  /* Connection */
  connectionStatus: ConnectionStatus;
  baudRate: number;
  mode: OperatingMode;
  demoMode: boolean;
  lastMessageTime: number | null;

  /* Hardware Features */
  fanRelay: RelayData;
  vitals: VitalsData;
  inference: GestureInference;
  voiceInference: VoiceInference;

  /* Data */
  sensorHistory: Record<string, SensorReading[]>;
  events: DeviceEvent[];
  rawMessages: SerialMessage[];
  stats: SessionStats;

  /* UI */
  displayPaused: boolean;
  settingsOpen: boolean;
  connectModalOpen: boolean;

  /* Config */
  maxHistoryPoints: number;
  maxEvents: number;
  maxRawMessages: number;
}

/* ── Parsed Line Result ──────────────────────────────── */
export interface ParsedLine {
  sensors?: { name: string; value: number; unit?: string }[];
  event?: { type: EventType; label: string; confidence?: number; meta?: Record<string, string | number> };
  fanState?: boolean;
  vitals?: { heartRate: number; spO2: number };
  prediction?: { class: string; value: number };
  detected?: { gesture: string; confidence?: number };
  voiceDetected?: { command: string; confidence?: number };
  confidence?: number;
  isCollecting?: boolean;
  isRecording?: boolean;
  isInferencing?: boolean;
  mpuStatus?: 'ok' | 'error';
  micStatus?: 'ok' | 'error';
  max30100Status?: 'initialized' | 'not_detected';
  sampleRate?: number;
  sampleCount?: number;
  systemStatus?: { model?: string; classes?: string[] };
}

/* ── Chart Config ────────────────────────────────────── */
export interface ChartConfig {
  title: string;
  sensorKeys: string[];
  colors: string[];
  unit?: string;
  yDomain?: [number, number];
}
