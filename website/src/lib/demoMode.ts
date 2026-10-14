/**
 * Demo Mode — Generates realistic simulated wristband data for UI testing.
 *
 * For Gesture Mode: Specifically mimics the real output of `gesture_relay_final.ino`
 * (MAX30100 Pulse Oximeter, Edge Impulse real_gesture_data predictions, and Relay Fan control).
 *
 * Clearly labeled as DEMO data. Never mixed with live hardware data.
 */

import { useDashboardStore } from '../store/dashboardStore';
import { parseVoiceLine, parseGestureLine } from './parser';

const VOICE_CLASSES = ['fan_on', 'stop', 'noise', 'unknown'] as const;
const GESTURE_CLASSES = ['fan_on', 'fan_off', 'idle'] as const;

let intervalId: number | null = null;
let tick = 0;
let baseHeartRate = 74;
let baseSpO2 = 98;
let simulatedFanOn = false;

/** Start generating demo data */
export function startDemo(): void {
  if (intervalId) return;
  tick = 0;
  const store = useDashboardStore.getState();
  store.setConnectionStatus('connected');

  // Emit boot lines based on operating mode
  if (store.mode === 'gesture') {
    const bootLines = [
      'TinyGest Gesture Fan Control',
      'Model: real_gesture_data',
      'Classes: fan_on, fan_off, idle',
      'MAX30100 initialized.',
      'Setup complete.',
    ];
    bootLines.forEach((line) => {
      const parsed = parseGestureLine(line);
      store.ingestParsedLine(parsed, `[DEMO] ${line}`);
    });
  } else {
    const bootLines = [
      '==================================',
      ' TinyGest Voice Control',
      ' ESP32 + INMP441 + MAX30100',
      '==================================',
      'Fan initialized OFF.',
      'MAX30100 initialized.',
      'INMP441 initialized.',
      'Audio sample rate: 16000',
      'Audio sample count: 16000',
      'Voice model ready.',
    ];
    bootLines.forEach((line) => {
      const parsed = parseVoiceLine(line);
      store.ingestParsedLine(parsed, `[DEMO] ${line}`);
    });
  }

  intervalId = window.setInterval(() => {
    const state = useDashboardStore.getState();
    const mode = state.mode;
    tick++;

    const t = tick * 0.1;

    if (mode === 'gesture') {
      // 1. Emit MPU-6500 accelerometer stream
      const ax = +(Math.sin(t * 0.6) * 1.8 + (Math.random() - 0.5) * 0.2).toFixed(3);
      const ay = +(Math.cos(t * 0.4) * 1.4 + (Math.random() - 0.5) * 0.2).toFixed(3);
      const az = +(9.81 + Math.sin(t * 0.2) * 0.4 + (Math.random() - 0.5) * 0.1).toFixed(3);
      const accelLine = `ACCEL_X:${ax}, ACCEL_Y:${ay}, ACCEL_Z:${az}`;
      state.ingestParsedLine(parseGestureLine(accelLine), `[DEMO] ${accelLine}`);

      // 2. Emit MAX30100 vitals every 10 ticks (~1 second)
      if (tick % 10 === 0) {
        baseHeartRate = Math.max(62, Math.min(95, baseHeartRate + (Math.random() - 0.48) * 1.5));
        baseSpO2 = Math.max(96, Math.min(99, Math.round(baseSpO2 + (Math.random() - 0.5) * 0.6)));
        const vitalsLine = `Heart rate: ${baseHeartRate.toFixed(2)} BPM | SpO2: ${baseSpO2}%`;
        state.ingestParsedLine(parseGestureLine(vitalsLine), `[DEMO] ${vitalsLine}`);
      }

      // 3. Emit Gesture recognition lifecycle every ~4 seconds (40 ticks)
      if (tick % 40 === 0) {
        state.ingestParsedLine(parseGestureLine('Collecting gesture...'), '[DEMO] Collecting gesture...');
      }

      if (tick % 40 === 18) {
        const chosen = simulatedFanOn
          ? (Math.random() > 0.35 ? 'fan_off' : 'idle')
          : (Math.random() > 0.35 ? 'fan_on' : 'idle');

        const conf = +(0.72 + Math.random() * 0.26).toFixed(3);
        const otherConf1 = +(((1 - conf) * 0.75)).toFixed(3);
        const otherConf2 = +(Math.max(0, 1 - conf - otherConf1)).toFixed(3);

        const preds: Record<string, number> = {};
        preds[chosen] = conf;
        const others = GESTURE_CLASSES.filter((c) => c !== chosen);
        preds[others[0]] = otherConf1;
        preds[others[1]] = otherConf2;

        state.ingestParsedLine(parseGestureLine('--- Gesture Predictions ---'), '[DEMO] --- Gesture Predictions ---');
        state.ingestParsedLine(parseGestureLine(`fan_on: ${preds.fan_on.toFixed(3)}`), `[DEMO] fan_on: ${preds.fan_on.toFixed(3)}`);
        state.ingestParsedLine(parseGestureLine(`fan_off: ${preds.fan_off.toFixed(3)}`), `[DEMO] fan_off: ${preds.fan_off.toFixed(3)}`);
        state.ingestParsedLine(parseGestureLine(`idle: ${preds.idle.toFixed(3)}`), `[DEMO] idle: ${preds.idle.toFixed(3)}`);
        state.ingestParsedLine(parseGestureLine(`Detected: ${chosen}`), `[DEMO] Detected: ${chosen}`);
        state.ingestParsedLine(parseGestureLine(`Confidence: ${conf}`), `[DEMO] Confidence: ${conf}`);

        if (conf >= 0.65) {
          if (chosen === 'fan_on') {
            simulatedFanOn = true;
            state.ingestParsedLine(parseGestureLine('ACTION: FAN ON'), '[DEMO] ACTION: FAN ON');
          } else if (chosen === 'fan_off') {
            simulatedFanOn = false;
            state.ingestParsedLine(parseGestureLine('ACTION: FAN OFF'), '[DEMO] ACTION: FAN OFF');
          } else {
            state.ingestParsedLine(parseGestureLine('IDLE: fan state unchanged.'), '[DEMO] IDLE: fan state unchanged.');
          }
        } else {
          state.ingestParsedLine(parseGestureLine('Low confidence; fan state unchanged.'), '[DEMO] Low confidence; fan state unchanged.');
        }
      }
    } else {
      // 1. Emit INMP441 Audio signal level for real-time charting
      const isCurrentlyRecording = (tick % 45) < 18;
      const baseAmp = isCurrentlyRecording ? 65 : 22;
      const audioLvl = +(baseAmp + Math.sin(t * 1.5) * 15 + (Math.random() - 0.5) * 10).toFixed(1);
      const micRms = +(Math.max(0.05, (audioLvl / 100) * 0.8)).toFixed(3);
      const audioLine = `AUDIO_LEVEL:${audioLvl}, MIC_RMS:${micRms}`;
      state.ingestParsedLine(parseVoiceLine(audioLine), `[DEMO] ${audioLine}`);

      // 2. Emit MAX30100 vitals every 10 ticks (~1 second)
      if (tick % 10 === 0) {
        baseHeartRate = Math.max(62, Math.min(95, baseHeartRate + (Math.random() - 0.48) * 1.5));
        baseSpO2 = Math.max(96, Math.min(99, Math.round(baseSpO2 + (Math.random() - 0.5) * 0.6)));
        const vitalsLine = `Heart Rate: ${baseHeartRate.toFixed(2)} BPM | SpO2: ${baseSpO2}%`;
        state.ingestParsedLine(parseVoiceLine(vitalsLine), `[DEMO] ${vitalsLine}`);
      }

      // 3. Voice Command recognition cycle every 45 ticks (~4.5 seconds)
      const phase = tick % 45;

      if (phase === 0) {
        state.ingestParsedLine(parseVoiceLine('----------------------------------'), '[DEMO] ----------------------------------');
        state.ingestParsedLine(parseVoiceLine('Recording audio...'), '[DEMO] Recording audio...');
        state.ingestParsedLine(parseVoiceLine('Speak your trained command.'), '[DEMO] Speak your trained command.');
      }

      if (phase === 18) {
        state.ingestParsedLine(parseVoiceLine('Recording complete.'), '[DEMO] Recording complete.');
        state.ingestParsedLine(parseVoiceLine('Running voice recognition...'), '[DEMO] Running voice recognition...');
      }

      if (phase === 24) {
        // Pick command to test
        const rand = Math.random();
        const chosen = simulatedFanOn
          ? (rand > 0.4 ? 'stop' : rand > 0.15 ? 'noise' : 'fan_on')
          : (rand > 0.4 ? 'fan_on' : rand > 0.15 ? 'noise' : 'stop');

        // Confidence (usually high, occasionally below 0.70 threshold)
        const isLowConf = Math.random() < 0.12;
        const conf = isLowConf
          ? +(0.45 + Math.random() * 0.22).toFixed(4)
          : +(0.78 + Math.random() * 0.20).toFixed(4);

        const rem = +(Math.max(0.01, 1 - conf)).toFixed(4);
        const others = VOICE_CLASSES.filter((c) => c !== chosen);
        const preds: Record<string, number> = {};
        preds[chosen] = conf;
        preds[others[0]] = +(rem * 0.5).toFixed(4);
        preds[others[1]] = +(rem * 0.3).toFixed(4);
        preds[others[2]] = +(rem * 0.2).toFixed(4);

        state.ingestParsedLine(parseVoiceLine('===== VOICE PREDICTIONS ====='), '[DEMO] ===== VOICE PREDICTIONS =====');
        VOICE_CLASSES.forEach((cls) => {
          state.ingestParsedLine(parseVoiceLine(`${cls}: ${preds[cls].toFixed(4)}`), `[DEMO] ${cls}: ${preds[cls].toFixed(4)}`);
        });

        state.ingestParsedLine(parseVoiceLine(`Detected command: ${chosen}`), `[DEMO] Detected command: ${chosen}`);
        state.ingestParsedLine(parseVoiceLine(`Confidence: ${conf}`), `[DEMO] Confidence: ${conf}`);

        if (conf < 0.70) {
          state.ingestParsedLine(parseVoiceLine('REJECTED: Confidence too low.'), '[DEMO] REJECTED: Confidence too low.');
          state.ingestParsedLine(parseVoiceLine('Fan state unchanged.'), '[DEMO] Fan state unchanged.');
        } else if (chosen === 'fan_on') {
          simulatedFanOn = true;
          state.ingestParsedLine(parseVoiceLine('ACTION: FAN ON'), '[DEMO] ACTION: FAN ON');
        } else if (chosen === 'stop') {
          simulatedFanOn = false;
          state.ingestParsedLine(parseVoiceLine('ACTION: FAN OFF'), '[DEMO] ACTION: FAN OFF');
        } else if (chosen === 'noise') {
          state.ingestParsedLine(parseVoiceLine('Noise detected. Fan state unchanged.'), '[DEMO] Noise detected. Fan state unchanged.');
        } else {
          state.ingestParsedLine(parseVoiceLine('Unknown command. Fan state unchanged.'), '[DEMO] Unknown command. Fan state unchanged.');
        }

        state.ingestParsedLine(
          parseVoiceLine(`Current fan state: ${simulatedFanOn ? 'ON' : 'OFF'}`),
          `[DEMO] Current fan state: ${simulatedFanOn ? 'ON' : 'OFF'}`
        );
      }
    }
  }, 100);
}

/** Stop demo data generation */
export function stopDemo(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  const store = useDashboardStore.getState();
  store.setConnectionStatus('disconnected');
}

/** Whether demo is currently running */
export function isDemoRunning(): boolean {
  return intervalId !== null;
}
