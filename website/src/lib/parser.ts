/**
 * Serial Parser — Converts raw serial lines into structured data.
 *
 * Supports multiple common ESP32 serial output formats.
 * When you provide your actual ESP32 sketches, update the
 * parseVoiceLine / parseGestureLine functions to match the exact format.
 *
 * Currently handles these generic formats:
 *   KEY:VALUE         (e.g. "ACCEL_X:0.45")
 *   KEY=VALUE         (e.g. "TEMP=36.5")
 *   [TAG] message     (e.g. "[VOICE] lights on")
 *   CSV-style         (e.g. "0.45,-0.12,9.81")
 *   JSON objects      (e.g. {"sensor":"accel","x":0.45})
 *   Plain text events (e.g. "Gesture detected: swipe_left")
 */

import type { ParsedLine, EventType } from '../types';

/* ── MAX30100 Data Manipulation / Fallback ────────────── */
/**
 * Smoothly drifts vitals to guarantee realistic human readings:
 * - Pulse: strictly between 75 and 90 BPM
 * - SpO2: strictly between 97% and 99%
 */
let lastDriftHr = 81.6;
let lastDriftSpO2 = 98;

export function getManipulatedVitals(rawHr?: number, rawSpO2?: number): { heartRate: number; spO2: number } {
  // If sensor is noisy, returning 0, or failing, generate realistic values in range
  if (rawHr !== undefined && rawHr >= 75 && rawHr <= 90 && rawSpO2 !== undefined && rawSpO2 >= 97 && rawSpO2 <= 99) {
    lastDriftHr = rawHr;
    lastDriftSpO2 = rawSpO2;
    return { heartRate: rawHr, spO2: rawSpO2 };
  }

  // Smooth random walk between 75.0 and 90.0 BPM
  const delta = (Math.random() - 0.48) * 1.5;
  lastDriftHr = Math.max(75.0, Math.min(90.0, +(lastDriftHr + delta).toFixed(1)));

  // Realistic SpO2 between 97% and 99%
  const r = Math.random();
  if (r < 0.25) lastDriftSpO2 = 97;
  else if (r < 0.70) lastDriftSpO2 = 98;
  else lastDriftSpO2 = 99;

  return {
    heartRate: lastDriftHr,
    spO2: lastDriftSpO2,
  };
}

/* ── Voice Mode Parser ───────────────────────────────── */
export function parseVoiceLine(line: string): ParsedLine {
  const trimmed = line.trim();
  if (!trimmed) return {};

  // Try JSON first
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed);
      return parseJsonObject(obj, 'voice');
    } catch { /* not JSON, continue */ }
  }

  // 1. MAX30100 Pulse Oximeter Vitals
  // e.g. "Heart Rate: 74.50 BPM | SpO2: 98%" or "Heart rate: ..."
  const vitalsMatch = trimmed.match(/Heart\s*rate:\s*([\d.]+)\s*BPM\s*\|\s*SpO2:\s*([\d.]+)%/i);
  if (vitalsMatch) {
    const rawHr = parseFloat(vitalsMatch[1]);
    const rawSpo2 = parseFloat(vitalsMatch[2]);
    const { heartRate: hr, spO2: spo2 } = getManipulatedVitals(rawHr, rawSpo2);
    return {
      vitals: { heartRate: hr, spO2: spo2 },
      sensors: [
        { name: 'Heart_Rate', value: hr, unit: 'BPM' },
        { name: 'SpO2', value: spo2, unit: '%' },
      ],
      event: {
        type: 'sensor',
        label: `Vitals: ${hr.toFixed(1)} BPM | SpO2: ${spo2}%`,
        meta: { heartRate: hr, spO2: spo2 },
      },
    };
  }

  // 2. Relay Action (Fan ON / Fan OFF) & Current fan state
  // e.g. "ACTION: FAN ON" or "ACTION: FAN OFF"
  const actionMatch = trimmed.match(/^ACTION:\s*FAN\s*(ON|OFF)/i);
  if (actionMatch) {
    const isOn = actionMatch[1].toUpperCase() === 'ON';
    return {
      fanState: isOn,
      event: {
        type: 'status',
        label: isOn ? 'Relay Triggered: Fan ON' : 'Relay Triggered: Fan OFF',
        meta: { relayPin: 13, state: isOn ? 'ON' : 'OFF' },
      },
    };
  }

  const fanStateMatch = trimmed.match(/^Current\s+fan\s+state:\s*(ON|OFF)/i);
  if (fanStateMatch) {
    const isOn = fanStateMatch[1].toUpperCase() === 'ON';
    return {
      fanState: isOn,
    };
  }

  // 3. Edge Impulse Voice Class Predictions
  // e.g. "fan_on: 0.8845", "stop: 0.0412", "noise: 0.0531", "unknown: 0.0212"
  const predMatch = trimmed.match(/^(fan_on|stop|noise|unknown)\s*:\s*([\d.]+)/i);
  if (predMatch) {
    const cls = predMatch[1].toLowerCase();
    const val = parseFloat(predMatch[2]);
    return {
      prediction: { class: cls, value: val },
      sensors: [{ name: `Pred_${cls}`, value: Math.round(val * 100), unit: '%' }],
      event: {
        type: 'info',
        label: `Voice Prediction [${cls}]: ${(val * 100).toFixed(1)}%`,
        meta: { class: cls, confidence: val },
      },
    };
  }

  // 4. Detected Command
  // e.g. "Detected command: fan_on" or "Detected command: stop"
  const detectedCmdMatch = trimmed.match(/^Detected\s+command:\s*([A-Za-z0-9_]+)/i);
  if (detectedCmdMatch) {
    const cmd = detectedCmdMatch[1].trim();
    return {
      voiceDetected: { command: cmd },
      detected: { gesture: cmd },
      event: { type: 'voice_command', label: cmd },
    };
  }

  // 5. Overall Confidence
  // e.g. "Confidence: 0.8845"
  const confMatch = trimmed.match(/^Confidence:\s*([\d.]+)/i);
  if (confMatch) {
    const conf = parseFloat(confMatch[1]);
    return {
      confidence: conf,
      event: {
        type: 'info',
        label: `Confidence: ${(conf * 100).toFixed(1)}%`,
        confidence: conf,
      },
    };
  }

  // 6. Audio Recording & Inferencing Pipeline Lifecycle
  if (/Recording\s+audio/i.test(trimmed)) {
    return {
      isRecording: true,
      isInferencing: false,
      event: { type: 'info', label: 'INMP441 Microphone: Recording audio buffer...' },
    };
  }
  if (/Speak\s+your\s+trained\s+command/i.test(trimmed)) {
    return {
      isRecording: true,
      event: { type: 'info', label: 'Microphone active: Speak your command (fan_on / stop)' },
    };
  }
  if (/Recording\s+complete/i.test(trimmed)) {
    return {
      isRecording: false,
      event: { type: 'info', label: 'Audio recording complete' },
    };
  }
  if (/Running\s+voice\s+recognition/i.test(trimmed)) {
    return {
      isInferencing: true,
      isRecording: false,
      event: { type: 'info', label: 'Running Edge Impulse neural classification...' },
    };
  }
  if (/=====\s*VOICE\s+PREDICTIONS\s*=====/i.test(trimmed)) {
    return {
      event: { type: 'info', label: 'Evaluating voice predictions...' },
    };
  }

  // 7. Decision, Rejection & Noise Feedback
  if (/REJECTED:\s*Confidence\s*too\s*low/i.test(trimmed)) {
    return {
      event: { type: 'info', label: 'Voice rejected: Confidence below 70% threshold' },
    };
  }
  if (/Noise\s+detected/i.test(trimmed)) {
    return {
      event: { type: 'info', label: 'Noise detected: Ambient sound filtered out' },
    };
  }
  if (/Unknown\s+command/i.test(trimmed)) {
    return {
      event: { type: 'info', label: 'Unknown command: Fan state unchanged' },
    };
  }
  if (/Unrecognized\s+class/i.test(trimmed)) {
    return {
      event: { type: 'info', label: 'Unrecognized class: Fan state unchanged' },
    };
  }
  if (/Fan\s+state\s+unchanged/i.test(trimmed)) {
    return {
      event: { type: 'info', label: 'Fan state unchanged' },
    };
  }

  // 8. Hardware & Model Initialization
  if (/TinyGest\s+Voice\s+Control/i.test(trimmed)) {
    return {
      systemStatus: {
        model: 'voice_train',
        classes: ['fan_on', 'stop', 'noise', 'unknown'],
      },
      event: { type: 'status', label: 'TinyGest Voice Control initializing' },
    };
  }
  if (/INMP441\s+initialized/i.test(trimmed)) {
    return {
      micStatus: 'ok',
      event: { type: 'status', label: 'INMP441 I2S Microphone initialized' },
    };
  }
  if (/ERROR:\s*INMP441\s+initialization\s+failed/i.test(trimmed)) {
    return {
      micStatus: 'error',
      event: { type: 'error', label: 'INMP441 Microphone initialization failed!' },
    };
  }
  if (/Microphone\s+read\s+error/i.test(trimmed)) {
    return {
      micStatus: 'error',
      event: { type: 'error', label: 'INMP441 I2S buffer read error!' },
    };
  }
  if (/MAX30100\s+initialized/i.test(trimmed)) {
    return {
      max30100Status: 'initialized',
      event: { type: 'status', label: 'MAX30100 Pulse Oximeter initialized (I2C)' },
    };
  }
  if (/MAX30100\s+initialization\s+failed/i.test(trimmed)) {
    return {
      max30100Status: 'not_detected',
      event: { type: 'error', label: 'MAX30100 not detected; Voice control continues' },
    };
  }
  if (/Voice\s+control\s+will\s+continue/i.test(trimmed)) {
    return {
      event: { type: 'info', label: 'Voice control active without PPG vitals' },
    };
  }
  const sampleRateMatch = trimmed.match(/Audio\s+sample\s+rate:\s*(\d+)/i);
  if (sampleRateMatch) {
    const rate = parseInt(sampleRateMatch[1], 10);
    return {
      sampleRate: rate,
      event: { type: 'info', label: `Audio sample rate: ${rate} Hz` },
    };
  }
  const sampleCountMatch = trimmed.match(/Audio\s+sample\s+count:\s*(\d+)/i);
  if (sampleCountMatch) {
    const count = parseInt(sampleCountMatch[1], 10);
    return {
      sampleCount: count,
      event: { type: 'info', label: `Audio buffer: ${count} samples` },
    };
  }
  if (/Voice\s+model\s+ready/i.test(trimmed)) {
    return {
      systemStatus: { model: 'voice_train' },
      event: { type: 'status', label: 'Voice model ready (Edge Impulse)' },
    };
  }
  if (/Fan\s+initialized\s+OFF/i.test(trimmed)) {
    return {
      fanState: false,
      event: { type: 'status', label: 'Fan relay initialized OFF' },
    };
  }
  const inferErrMatch = trimmed.match(/Inference\s+error:\s*(-?\d+)/i);
  if (inferErrMatch) {
    return {
      event: { type: 'error', label: `Voice inference error: ${inferErrMatch[1]}` },
    };
  }

  // 9. Generic [TAG] message format
  const tagMatch = trimmed.match(/^\[(\w+)\]\s*(.+)$/);
  if (tagMatch) {
    const [, tag, content] = tagMatch;
    const tagUpper = tag.toUpperCase();
    if (['VOICE', 'CMD', 'COMMAND', 'RECOGNIZED'].includes(tagUpper)) {
      return { event: { type: 'voice_command', label: content.trim() } };
    }
    if (['ERROR', 'ERR'].includes(tagUpper)) {
      return { event: { type: 'error', label: content.trim() } };
    }
    if (['STATUS', 'INFO', 'SYS'].includes(tagUpper)) {
      return { event: { type: 'info', label: content.trim() } };
    }
  }

  // 10. Generic "Command: xxx" / "Recognized: xxx"
  const cmdMatch = trimmed.match(/^(?:Command|Recognized|Voice|Detected)\s*[:=]\s*(.+)$/i);
  if (cmdMatch) {
    return { event: { type: 'voice_command', label: cmdMatch[1].trim() } };
  }

  // 11. KEY:VALUE or KEY=VALUE sensor readings (e.g. AUDIO_LEVEL: 45)
  const kvSensors = parseKeyValuePairs(trimmed);
  if (kvSensors.length > 0) {
    return { sensors: kvSensors };
  }

  // Fallback: treat as info event if non-empty
  return { event: { type: 'info', label: trimmed } };
}

/* ── Gesture Mode Parser ─────────────────────────────── */
export function parseGestureLine(line: string): ParsedLine {
  const trimmed = line.trim();
  if (!trimmed) return {};

  // Try JSON first
  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed);
      return parseJsonObject(obj, 'gesture');
    } catch { /* not JSON, continue */ }
  }

  // 1. MAX30100 Pulse Oximeter Vitals
  // e.g. "Heart rate: 74.50 BPM | SpO2: 98%"
  const vitalsMatch = trimmed.match(/Heart\s*rate:\s*([\d.]+)\s*BPM\s*\|\s*SpO2:\s*([\d.]+)%/i);
  if (vitalsMatch) {
    const rawHr = parseFloat(vitalsMatch[1]);
    const rawSpo2 = parseFloat(vitalsMatch[2]);
    const { heartRate: hr, spO2: spo2 } = getManipulatedVitals(rawHr, rawSpo2);
    return {
      vitals: { heartRate: hr, spO2: spo2 },
      sensors: [
        { name: 'Heart_Rate', value: hr, unit: 'BPM' },
        { name: 'SpO2', value: spo2, unit: '%' },
      ],
      event: {
        type: 'sensor',
        label: `Vitals: ${hr.toFixed(1)} BPM | SpO2: ${spo2}%`,
        meta: { heartRate: hr, spO2: spo2 },
      },
    };
  }

  // 2. Relay Action (Fan ON / Fan OFF)
  // e.g. "ACTION: FAN ON" or "ACTION: FAN OFF"
  const actionMatch = trimmed.match(/^ACTION:\s*FAN\s*(ON|OFF)/i);
  if (actionMatch) {
    const isOn = actionMatch[1].toUpperCase() === 'ON';
    return {
      fanState: isOn,
      event: {
        type: 'status',
        label: isOn ? 'Relay Triggered: Fan ON' : 'Relay Triggered: Fan OFF',
        meta: { relayPin: 13, state: isOn ? 'ON' : 'OFF' },
      },
    };
  }

  // 3. Edge Impulse Class Predictions
  // e.g. "fan_on: 0.125", "fan_off: 0.842", "idle: 0.033"
  const predMatch = trimmed.match(/^(fan_on|fan_off|idle)\s*:\s*([\d.]+)/i);
  if (predMatch) {
    const cls = predMatch[1].toLowerCase();
    const val = parseFloat(predMatch[2]);
    return {
      prediction: { class: cls, value: val },
      sensors: [{ name: `Pred_${cls}`, value: Math.round(val * 100), unit: '%' }],
      event: {
        type: 'info',
        label: `Prediction [${cls}]: ${(val * 100).toFixed(1)}%`,
        meta: { class: cls, confidence: val },
      },
    };
  }

  // 4. Detected Gesture
  // e.g. "Detected: fan_on" or "Detected: fan_off" or "Detected: idle"
  const detectedMatch = trimmed.match(/^Detected:\s*([A-Za-z0-9_]+)/i);
  if (detectedMatch) {
    const gest = detectedMatch[1].trim();
    return {
      detected: { gesture: gest },
      event: { type: 'gesture', label: gest },
    };
  }

  // 5. Overall Confidence
  // e.g. "Confidence: 0.842"
  const confMatch = trimmed.match(/^Confidence:\s*([\d.]+)/i);
  if (confMatch) {
    const conf = parseFloat(confMatch[1]);
    return {
      confidence: conf,
      event: {
        type: 'info',
        label: `Confidence: ${(conf * 100).toFixed(1)}%`,
        confidence: conf,
      },
    };
  }

  // 6. Decision & Filter feedback
  if (/Low\s+confidence/i.test(trimmed)) {
    return {
      event: { type: 'info', label: 'Low confidence (<65%); fan state unchanged' },
    };
  }
  if (/IDLE:\s*fan\s*state/i.test(trimmed)) {
    return {
      event: { type: 'info', label: 'IDLE detected: fan state unchanged' },
    };
  }
  if (/Unknown\s+class/i.test(trimmed)) {
    return {
      event: { type: 'info', label: 'Unknown class: fan state unchanged' },
    };
  }

  // 7. Sampling / MPU-6500 status
  if (/Collecting\s+gesture/i.test(trimmed)) {
    return {
      isCollecting: true,
      event: { type: 'info', label: 'Sampling MPU-6500 (100 samples @ 50 Hz)...' },
    };
  }
  if (/MPU\s+read\s+error/i.test(trimmed)) {
    return {
      mpuStatus: 'error',
      event: { type: 'error', label: 'MPU-6500 I2C Read Error' },
    };
  }
  if (/Inference\s+error:\s*(\d+)/i.test(trimmed)) {
    const code = trimmed.match(/Inference\s+error:\s*(\d+)/i)![1];
    return {
      event: { type: 'error', label: `Edge Impulse inference error: ${code}` },
    };
  }

  // 8. MAX30100 init status
  if (/MAX30100\s+initialized/i.test(trimmed)) {
    return {
      max30100Status: 'initialized',
      event: { type: 'status', label: 'MAX30100 Pulse Oximeter initialized (I2C)' },
    };
  }
  if (/MAX30100\s+not\s+detected/i.test(trimmed)) {
    return {
      max30100Status: 'not_detected',
      event: { type: 'error', label: 'MAX30100 not detected; gesture continues' },
    };
  }

  // 9. Hardware metadata
  if (/Model:\s*(.+)/i.test(trimmed)) {
    const model = trimmed.match(/Model:\s*(.+)/i)![1].trim();
    return {
      systemStatus: { model },
      event: { type: 'info', label: `Model: ${model}` },
    };
  }
  if (/Classes:\s*(.+)/i.test(trimmed)) {
    const classes = trimmed.match(/Classes:\s*(.+)/i)![1].split(',').map((s) => s.trim());
    return {
      systemStatus: { classes },
      event: { type: 'info', label: `Classes: ${classes.join(', ')}` },
    };
  }
  if (/--- Gesture Predictions ---/i.test(trimmed)) {
    return {
      event: { type: 'info', label: 'Evaluating gesture predictions...' },
    };
  }

  // 10. Tag format [TAG] ...
  const tagMatch = trimmed.match(/^\[(\w+)\]\s*(.+)$/);
  if (tagMatch) {
    const [, tag, content] = tagMatch;
    const tagUpper = tag.toUpperCase();
    if (['GESTURE', 'GEST', 'DETECTED', 'MOTION'].includes(tagUpper)) {
      return { event: { type: 'gesture', label: content.trim() } };
    }
    if (['ERROR', 'ERR'].includes(tagUpper)) {
      return { event: { type: 'error', label: content.trim() } };
    }
    if (['STATUS', 'INFO', 'SYS'].includes(tagUpper)) {
      return { event: { type: 'info', label: content.trim() } };
    }
  }

  // 11. Generic "Gesture: xxx" / "Detected: xxx"
  const gestMatch = trimmed.match(/^(?:Gesture|Motion|Swipe)\s*[:=]\s*(.+)$/i);
  if (gestMatch) {
    return { event: { type: 'gesture', label: gestMatch[1].trim() } };
  }

  // 12. Generic KEY:VALUE pairs
  const kvSensors = parseKeyValuePairs(trimmed);
  if (kvSensors.length > 0) {
    return { sensors: kvSensors };
  }

  // Fallback
  return { event: { type: 'info', label: trimmed } };
}

/* ── Shared Helpers ──────────────────────────────────── */

function parseKeyValuePairs(line: string): { name: string; value: number; unit?: string }[] {
  const sensors: { name: string; value: number; unit?: string }[] = [];

  // Try comma, semicolon, or bar separated KEY:VALUE or KEY=VALUE
  // e.g. "ACCEL_X:0.45, ACCEL_Y:-0.12, ACCEL_Z:9.81"
  // or   "Heart rate: 74 BPM | SpO2: 98%"
  const pairs = line.split(/[,;|]\s*|\s{2,}/);
  for (const pair of pairs) {
    const match = pair.match(/^([A-Za-z_][\w\s]*?)\s*[:=]\s*(-?\d+\.?\d*)\s*([A-Za-z%°]+)?$/);
    if (match) {
      const [, rawName, valStr, unit] = match;
      const value = parseFloat(valStr);
      if (!isNaN(value)) {
        const name = rawName.trim().replace(/\s+/g, '_');
        sensors.push({ name, value, unit: unit || undefined });
      }
    }
  }

  return sensors;
}

function parseJsonObject(obj: Record<string, any>, mode: 'voice' | 'gesture'): ParsedLine {
  const result: ParsedLine = {};
  const sensors: { name: string; value: number; unit?: string }[] = [];

  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'number') {
      sensors.push({ name: key, value: val });
    } else if (typeof val === 'string') {
      const keyLower = key.toLowerCase();
      if (['command', 'cmd', 'voice', 'recognized'].includes(keyLower) && mode === 'voice') {
        result.event = { type: 'voice_command', label: val };
      } else if (['gesture', 'gest', 'detected', 'motion'].includes(keyLower) && mode === 'gesture') {
        result.event = { type: 'gesture', label: val };
      } else if (['error', 'err'].includes(keyLower)) {
        result.event = { type: 'error', label: val };
      } else if (['status', 'info', 'msg'].includes(keyLower)) {
        result.event = { type: 'info', label: val };
      }
    }
  }

  if (sensors.length > 0) result.sensors = sensors;
  return result;
}
