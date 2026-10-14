# ⚡ TinyGest Web Dashboard

> Real-time hardware telemetry, TinyML inferencing monitor, and appliance controller for the **TinyGest ESP32 Smart Wristband** via the **Web Serial API**.

---

## 🌟 Highlights

- **Direct In-Browser USB Streaming**: Connects directly to the ESP32 via Web Serial API (`115200` baud) — no background Python bridges or WebSockets required.
- **Dual Edge Impulse TinyML Modes**:
  - ✋ **Gesture Recognition**: MPU-6500 6-axis IMU sampling @ 50 Hz (`fan_on`, `fan_off`, `idle` with 65% confidence threshold).
  - 🎙️ **Voice Command Recognition**: INMP441 I2S digital microphone sampling @ 16 kHz (`fan_on`, `stop`, `noise`, `unknown` with 70% confidence threshold).
- **Live Biometric Vitals**: MAX30100 photoplethysmography (PPG) pulse oximetry monitoring live **Heart Rate (BPM)** and **Blood Oxygen Saturation (SpO₂ %)**.
- **Appliance Fan Controller**: Active-LOW relay trigger on **GPIO 13** with animated fan visualizer, real-time status telemetry, and manual override.
- **Real-Time Analytics**: Multi-series time-series charts using Recharts for biometric trends, IMU motion dynamics, and class prediction probability trajectories.
- **Simulation Mode**: Built-in synthetic hardware stream generator for testing all features without physical hardware.

---

## 🛠️ Technology Stack

- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom glassmorphism and ambient glow effects
- **State Management**: Zustand
- **Charting**: Recharts
- **Icons**: Lucide React
- **Hardware Protocol**: Web Serial API (`navigator.serial`)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- **Browser**: Google Chrome 89+, Microsoft Edge 89+, or Chromium-based browsers with Web Serial API enabled

### Installation

```bash
# Clone the repository and navigate into the website folder
git clone https://github.com/defxharsh/tiny_ml_project.git
cd tiny_ml_project/website

# Install dependencies
npm install

# Launch development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Building for Production

```bash
npm run build
```

The production assets will be built in the `dist/` directory.

---

## 🔌 Hardware Connections (ESP32)

| Component | Interface | ESP32 Pins | Logic / Specs |
|---|---|---|---|
| **Relay Module** | Digital Output | GPIO 13 | Active-LOW (LOW = ON, HIGH = OFF) |
| **MAX30100** | I2C Bus | SDA: GPIO 18, SCL: GPIO 19 | 100 kHz, 3.3V, Address `0x57` |
| **MPU-6500** | I2C Bus 1 | SDA: GPIO 21, SCL: GPIO 22 | 100 kHz, Address `0x68` (Gesture mode) |
| **INMP441** | I2S Standard | SCK: GPIO 33, WS: GPIO 25, SD: GPIO 32 | 16 kHz Mono (Voice mode) |

---

## 📁 Project Structure

```text
website/
├── src/
│   ├── components/      # UI components (FanRelayCard, VitalsPanel, VoicePanel, etc.)
│   ├── lib/             # SerialManager, Parser, CSV export, and Demo data engine
│   ├── store/           # Zustand centralized state store
│   ├── types/           # TypeScript data contracts & models
│   ├── App.tsx          # Main dashboard shell
│   └── index.css        # Tailwind & custom glass design tokens
├── obsidian/            # Comprehensive hardware & protocol documentation
├── firmware/            # ESP32 Arduino sketches (Gesture & Voice)
├── index.html           # HTML5 entrypoint
├── package.json         # NPM dependencies and scripts
├── tailwind.config.js   # Tailwind theme extensions
└── vite.config.ts       # Vite build configuration
```
