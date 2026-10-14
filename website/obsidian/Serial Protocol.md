# 📡 Serial Protocol & Firmware Specification

> Complete documentation of the serial protocol, hardware configuration, and message formats implemented in `gesture_relay_final.ino`.

## 1. Hardware Pinout & Architecture

| Component | Interface | ESP32 Pins | Description |
|---|---|---|---|
| **MPU-6500** | I2C Bus 1 (`TwoWire MPUWire = TwoWire(1)`) | SDA: GPIO 21, SCL: GPIO 22 | 6-Axis Accelerometer (Addr: `0x68`, 100 kHz) |
| **MAX30100** | Default Wire Bus | SDA: GPIO 18, SCL: GPIO 19 | Pulse Oximeter & Heart Rate PPG (Addr: `0x57`) |
| **Relay Module** | Digital Output | GPIO 13 | Controls Ventilation Fan (Active-LOW logic) |

### Relay Control Logic
- `FAN_ON  = LOW` (0V on GPIO 13 energizes relay coil)
- `FAN_OFF = HIGH` (3.3V on GPIO 13 de-energizes relay)
- Default boot state: `FAN_OFF`

---

## 2. Machine Learning Pipeline (Edge Impulse)

- **Model**: `real_gesture_data` (`#include <real_gesture_data_inferencing.h>`)
- **Classification Classes**:
  1. `fan_on` → Triggers Relay ON (`ACTION: FAN ON`)
  2. `fan_off` → Triggers Relay OFF (`ACTION: FAN OFF`)
  3. `idle` → Neutral resting position (fan state unchanged)
- **Confidence Threshold**: `0.65` (65%)
- **Sampling Specification**: 100 samples at 50 Hz (`SAMPLE_INTERVAL` = 20ms, 2.0-second time frame window)

---

## 3. Serial Message Formats (`gesture_relay_final.ino`)

Baud Rate: **115200** (`Serial.begin(115200)`)

### 3.1 Boot Sequence
```text
TinyGest Gesture Fan Control
Model: real_gesture_data
Classes: fan_on, fan_off, idle
MAX30100 initialized.
Setup complete.
```

### 3.2 Live Biometric Vitals (MAX30100)
Printed once every 1,000 ms:
```text
Heart rate: 74.50 BPM | SpO2: 98%
```
- **Heart Rate**: Extracted via regex `Heart rate:\s*([\d.]+)\s*BPM`
- **SpO2 Saturation**: Extracted via regex `SpO2:\s*([\d.]+)%`

### 3.3 Gesture Prediction Block (Edge Impulse)
Printed after every 100-sample classification window:
```text
Collecting gesture...
--- Gesture Predictions ---
fan_on: 0.125
fan_off: 0.842
idle: 0.033
Detected: fan_off
Confidence: 0.842
ACTION: FAN OFF
```

### 3.4 Action Decision Strings
- `ACTION: FAN ON` → Relay triggered; Fan turned ON.
- `ACTION: FAN OFF` → Relay triggered; Fan turned OFF.
- `Low confidence; fan state unchanged.` → Highest prediction was below 0.65.
- `IDLE: fan state unchanged.` → Wrist in idle pose.
- `Unknown class; fan state unchanged.` → Unrecognized label.

### 3.5 Error Logs
- `MPU read error!` → I2C communication fault with MPU-6500.
- `Inference error: <code>` → Edge Impulse inference error.
- `MAX30100 not detected; gesture control continues.` → PPG sensor disconnected.

---

---

## 4. Voice Firmware Specification (`voice.ino`)

> Complete documentation of the serial protocol, hardware configuration, and message formats implemented in `voice_final/voice/voice.ino`.

### 4.1 Hardware Pinout & Architecture (Voice Mode)

| Component | Interface | ESP32 Pins | Description |
|---|---|---|---|
| **INMP441** | I2S Standard Mode (Mono) | SCK: GPIO 33, WS: GPIO 25, SD: GPIO 32 | Digital MEMS Omnidirectional Microphone |
| **MAX30100** | Default Wire Bus | SDA: GPIO 18, SCL: GPIO 19 | Pulse Oximeter & Heart Rate PPG (Addr: `0x57`) |
| **Relay Module** | Digital Output | GPIO 13 | Controls Ventilation Fan (Active-LOW logic: LOW = ON, HIGH = OFF) |

### 4.2 Machine Learning Pipeline (Edge Impulse Voice)

- **Model**: `voice_train` (`#include <voice_train_inferencing.h>`)
- **Classification Classes**:
  1. `fan_on` → Triggers Relay ON (`ACTION: FAN ON`)
  2. `stop` → Triggers Relay OFF (`ACTION: FAN OFF`)
  3. `noise` → Background noise / ambient speech (fan state unchanged)
  4. `unknown` → Unrecognized phonemes / out-of-vocabulary (fan state unchanged)
- **Confidence Threshold**: `0.70` (70%)
- **Audio Configuration**: `EI_CLASSIFIER_FREQUENCY` (16,000 Hz), 32-bit shifted to 16-bit PCM

### 4.3 Serial Message Formats (`voice.ino`)

Baud Rate: **115200** (`Serial.begin(115200)`)

#### Boot Sequence
```text
==================================
 TinyGest Voice Control
 ESP32 + INMP441 + MAX30100
==================================
Fan initialized OFF.
MAX30100 initialized.
INMP441 initialized.
Audio sample rate: 16000
Audio sample count: 16000
Voice model ready.
```

#### Audio Recording & Inferencing Block
```text
----------------------------------
Recording audio...
Speak your trained command.
Recording complete.
Running voice recognition...

===== VOICE PREDICTIONS =====
fan_on: 0.8845
stop: 0.0412
noise: 0.0531
unknown: 0.0212
Detected command: fan_on
Confidence: 0.8845
ACTION: FAN ON
Current fan state: ON
Heart Rate: 74.50 BPM | SpO2: 98%
```

#### Voice Action Decisions & Rejections
- `ACTION: FAN ON` → Relay triggered; Fan turned ON.
- `ACTION: FAN OFF` → Relay triggered; Fan turned OFF.
- `REJECTED: Confidence too low.` → Highest class probability was below 0.70.
- `Noise detected. Fan state unchanged.` → Background noise classified.
- `Unknown command. Fan state unchanged.` → Unknown class detected.
- `Current fan state: ON` / `OFF` → Current state acknowledgment.

---

## 5. Parser Implementation (`src/lib/parser.ts`)

The parser maps the serial stream to `ParsedLine`:
```typescript
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
```

---

## Related Notes
- [[Architecture]]
- [[Component Reference]]
- [[Setup Guide]]
- [[Troubleshooting]]
- [[Session Log]]
