# 🚀 Setup Guide

> How to install, run, and connect the TinyGest Dashboard.

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Browser | Chrome 89+ or Edge 89+ |
| ESP32 | Connected via USB |

> [!IMPORTANT]
> Web Serial API only works in **Chromium-based browsers** (Chrome, Edge, Brave, Opera).
> Firefox and Safari do NOT support Web Serial API.

## Installation

```bash
cd d:\Study\TinyGest
npm install
npm run dev
```

The dashboard opens at `http://localhost:5173`.

## Connecting Your ESP32

### Step 1: Upload Firmware
Upload either the **Voice Control** or **Gesture Control** sketch to your ESP32 using Arduino IDE.

### Step 2: Close Serial Monitor
> [!CAUTION]
> **Close the Arduino IDE Serial Monitor** before connecting via the dashboard.
> Only one application can access a serial port at a time.

### Step 3: Connect
1. Open the dashboard in Chrome/Edge
2. Click the **connection status pill** in the navbar (or the "Connect" prompt)
3. Select the **operating mode** matching your uploaded firmware
4. Set the **baud rate** to match your sketch's `Serial.begin()` value
5. Click **Connect via USB**
6. Select your ESP32's COM port from the browser popup
7. Data should start flowing immediately

### Step 4: Monitor
- Watch live sensor charts update
- See voice commands or gestures appear in real-time
- Check the event timeline for activity
- Expand the serial console for raw debug output

## Demo Mode

To test the UI without hardware:
1. Click the connection status pill
2. Click **Start Demo Mode**
3. The dashboard will show simulated data labeled as `[DEMO]`

## Building for Production

```bash
npm run build
```

Output in `dist/` — serve with any static file server.

## Baud Rate Reference

| Common ESP32 Baud Rates | Notes |
|---|---|
| 9600 | Slow, reliable |
| 115200 | **Most common default** |
| 230400 | Fast, good for high-frequency data |

## Related

- [[TinyGest Dashboard]]
- [[Architecture]]
- [[Troubleshooting]]
- [[Serial Protocol]]
