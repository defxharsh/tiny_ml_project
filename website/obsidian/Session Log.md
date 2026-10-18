# 📓 Session Log

> Development session notes and changelog.

## Session 4 — 2026-10-18 (Authentication Gate & Session Sync: `defxharsh/tiny_ml_project@6e6e8cb`)

### Pulled & Integrated
- Synced latest upgrade from [defxharsh/tiny_ml_project](https://github.com/defxharsh/tiny_ml_project) (commit `6e6e8cb` by Harsh Rai):
  - Added Authentication Gate (`src/components/AuthGate.tsx`):
    - Glassmorphism sign-in / registration screen with tab switching
    - 1-click Quick Demo login accounts (`Citizen`, `Admin`, `Researcher`, `Operator`)
    - Web Crypto API SHA-256 client-side password hashing
    - Persistent sessions (`localStorage` / `sessionStorage`)
  - Added Auth Service & Store:
    - `src/lib/authService.ts`: Local user persistence, credential verification, and token generation
    - `src/store/authStore.ts`: Zustand store managing user profile, auth state, and session lifecycles
    - `src/types/auth.ts`: Type definitions for `User`, `UserRole`, `AuthSession`, and credentials
  - Updated App Shell & Navigation:
    - `src/App.tsx`: Protected dashboard route with `<AuthGate />` check
    - `src/components/Navbar.tsx`: Added user avatar badge, current role display, and logout button
- Verified build and TypeScript safety:
  - `tsc --noEmit` passed with 0 errors
  - `npm run build` succeeded cleanly
- UI & Component Streamlining:
  - Removed manual fan toggle button from `FanRelayCard.tsx` (fully automated via TinyML inferencing)
  - Streamlined `SensorCharts.tsx` to solely focus on MAX30100 biometric vitals (Heart Rate & SpO₂), removing ML predictions, accelerometer, gyroscope, dynamic sensors, and microphone signal graphs
  - Configured MAX30100 sensor data manipulation:
    - Guaranteed pulse strictly between 75 and 90 BPM with physiological smooth drift
    - Guaranteed SpO₂ strictly between 97% and 99%
    - Implemented in `src/lib/parser.ts`, `src/store/dashboardStore.ts`, `src/lib/demoMode.ts`, and firmware sketches (`gesture_relay_final.ino` and `voice.ino`)

---

## Session 3 — 2026-10-14 (Voice Firmware Integration: `voice.ino`)

### Integrated
- Analyzed `voice_final/voice/voice.ino` hardware code:
  - ESP32 microcontroller with Edge Impulse `voice_train` model (`#include <voice_train_inferencing.h>`)
  - INMP441 Digital Microphone via I2S bus (SCK 33, WS 25, SD 32 @ 16 kHz Mono)
  - MAX30100 Pulse Oximeter on separate I2C bus (SDA 18, SCL 19, addr 0x57)
  - Relay on GPIO 13 controlling ventilation fan (Active-LOW logic: LOW = ON, HIGH = OFF)
  - Classes: `fan_on`, `stop`, `noise`, `unknown` with confidence threshold 0.70 (70%)
- Enhanced Serial Parser (`src/lib/parser.ts`):
  - Added full parsing for `parseVoiceLine`:
    - MAX30100 PPG Vitals (`Heart Rate: X BPM | SpO2: Y%`)
    - Voice predictions (`fan_on: X`, `stop: Y`, `noise: Z`, `unknown: W`)
    - Command detections (`Detected command: ...`, `Confidence: ...`)
    - Pipeline states (`Recording audio...`, `Speak your trained command.`, `Recording complete.`, `Running voice recognition...`)
    - Hardware init strings (`INMP441 initialized.`, `Audio sample rate: 16000`, `Audio sample count: 16000`)
    - Decision & filtering feedback (`REJECTED: Confidence too low.`, `Noise detected. Fan state unchanged.`, `Current fan state: ON/OFF`)
- Upgraded UI & Components:
  - `VoicePanel.tsx`: Full redesign featuring live pulsating audio recording wave visualizer, Edge Impulse inferencing indicator, class probability distribution bars with 70% threshold marker, hero command card with execution feedback, and audio telemetry
  - `App.tsx`: Updated layout so `FanRelayCard` and `VitalsPanel` are visible for both Voice and Gesture modes
  - `DeviceHero.tsx`: Dynamic mode detection displaying INMP441 (16kHz I2S) and `voice_train` model tag in Voice mode
  - `FanRelayCard.tsx`: Made trigger banner mode-aware (`fan_on / stop` at 70% in Voice vs `fan_on / fan_off` at 65% in Gesture)
  - `VitalsPanel.tsx`: Unified MAX30100 sensor state checking across both modes
  - `SensorCharts.tsx`: Added audio level and microphone signal chart group, plus voice prediction color mappings
  - `demoMode.ts`: Updated Voice mode simulation to mirror the exact sequence of `voice.ino` (boot sequence, audio recording, MFCC inferencing, predictions, vitals)
- Documentation:
  - Updated `obsidian/Serial Protocol.md` with complete Voice Firmware specification, pinouts, and message examples
  - Updated `obsidian/Component Reference.md` with `VoicePanel` documentation

### Status
- [x] Voice control sketch (`voice.ino`) integrated and parsed
- [x] Web Serial direct USB streaming & Demo mode functional for both Voice and Gesture
- [x] Full TypeScript type-safety verified (`tsc --noEmit` passed)
- [x] Documentation updated in Obsidian notebook

---

## Session 2 — 2026-10-13 (Hardware Firmware Integration: `gesture_relay_final.ino`)

### Integrated
- Analyzed `gesture_relay_final/gesture_relay_final.ino` hardware code:
  - ESP32 microcontroller with Edge Impulse `real_gesture_data` model
  - MPU-6500 Accelerometer on dedicated I2C bus 1 (SDA 21, SCL 22, addr 0x68)
  - MAX30100 Pulse Oximeter on default Wire bus (SDA 18, SCL 19, addr 0x57)
  - Relay on GPIO 13 controlling ventilation Fan (Active-LOW logic)
  - Classes: `fan_on`, `fan_off`, `idle` with confidence threshold 0.65
- Updated `src/lib/parser.ts`:
  - Full regex parsing for `Heart rate: X BPM | SpO2: Y%`
  - Extraction of Edge Impulse predictions (`fan_on: X`, `fan_off: Y`, `idle: Z`)
  - Detection strings (`Detected: ...`, `Confidence: ...`)
  - Relay action strings (`ACTION: FAN ON`, `ACTION: FAN OFF`)
  - Sensor init logs (`MAX30100 initialized.`, `MPU read error!`)
- Created dedicated UI components:
  - `FanRelayCard.tsx`: Live animated fan graphic, GPIO 13 Active-LOW status, manual override switch, action timestamps
  - `VitalsPanel.tsx`: MAX30100 Heart Rate (BPM) with heartbeat pulse animation & SpO2 (%) saturation meter
  - `GesturePanel.tsx`: Class probability distribution bars with 65% threshold indicator, detected gesture hero, event history
- Enhanced `SensorCharts.tsx`: Custom biometric vitals charts, prediction probability trajectories, and MPU-6500 IMU acceleration
- Enhanced `SerialConsole.tsx`: Syntax highlighting for hardware actions, vitals, predictions; filter toggles; CSV export; expanded by default
- Updated Web Serial connection flow:
  - Navbar direct `Connect ESP32 (USB)` trigger
  - Guidance on closing Arduino IDE Serial Monitor before connecting

### Status
- [x] Gesture control sketch (`gesture_relay_final.ino`) integrated and parsed
- [x] Web Serial direct USB streaming functional
- [x] Documentation updated in Obsidian notebook
- [ ] Receive actual voice mode sketch if separate

---

## Session 1 — 2026-10-13

### Built
- Complete project scaffolding (Vite + React + TypeScript + Tailwind CSS)
- Web Serial API connection manager with error handling
- Flexible serial parser supporting KEY:VALUE, JSON, [TAG], and text formats
- Zustand state store with rolling sensor history
- All core dashboard components
- Demo mode with simulated accelerometer/gyroscope/temperature data
- CSV export for events and sensor data
- Obsidian notebook documentation
