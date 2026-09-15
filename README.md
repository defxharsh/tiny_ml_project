# TinyGest Interface

A real-time monitoring dashboard for the **TinyGest** assistive interface system — a TinyML-based gesture recognition system running on ESP32 with MPU6050 accelerometer.

## Overview

This Python/Streamlit application provides a local desktop interface to monitor the TinyGest hardware system:

- **ESP32** reads MPU6050 sensor data via I2C
- **Edge Impulse TinyML model** (quantized int8) runs inference on-device
- **5 gesture classes**: DOWN, IDLE, LEFT, RIGHT, UP
- **Relay control** based on gesture recognition
- **Serial output** sent to PC for visualization

The dashboard displays live gesture predictions, confidence, relay status, and real-time accelerometer graphs.

## Requirements

- **Python 3.9+**
- **Windows** (tested on Windows 10/11)
- **ESP32** with TinyGest firmware (for hardware mode)

## Installation

### 1. Clone / Navigate to Project

```cmd
cd TinyGest_Interface
```

### 2. Create Virtual Environment

```cmd
python -m venv .venv
```

### 3. Activate Virtual Environment

```cmd
.venv\Scripts\activate
```

### 4. Install Dependencies

```cmd
pip install -r requirements.txt
```

## Running the Dashboard

```cmd
streamlit run app.py
```

This opens the dashboard in your default browser at `http://localhost:8501`.

## Usage

### Demo / Mock Mode (No Hardware Required)

1. Check **"Demo / Mock Mode"** in the sidebar
2. Click **"Start Mock"**
3. The dashboard will display simulated gesture data, confidence values, relay states, and live accelerometer graphs
4. **Clearly labeled** as "DEMO / MOCK MODE" — never mistake for real data

### Real Hardware Mode (ESP32 Required)

1. **Close Arduino Serial Monitor** — cannot share COM port
2. Uncheck **"Demo / Mock Mode"**
3. Select your **ESP32 COM port** from dropdown
4. Confirm **Baud Rate: 115200** (default)
5. Click **"Connect"**
6. Dashboard shows live data from ESP32

## Expected Serial Protocol

The ESP32 should send CSV lines in this format:

```
GESTURE,<label>,<confidence>,RELAY,<state>,<acc_x>,<acc_y>,<acc_z>
```

| Field | Description | Example |
|-------|-------------|---------|
| 0 | Fixed: `GESTURE` | `GESTURE` |
| 1 | Gesture label | `RIGHT` |
| 2 | Confidence (0–1) | `0.92` |
| 3 | Fixed: `RELAY` | `RELAY` |
| 4 | Relay state (0/1) | `1` |
| 5 | Acc X (raw) | `1245` |
| 6 | Acc Y (raw) | `-532` |
| 7 | Acc Z (raw) | `16234` |

**Valid gestures:** `DOWN`, `IDLE`, `LEFT`, `RIGHT`, `UP`

**Examples:**
```
GESTURE,RIGHT,0.92,RELAY,1,1245,-532,16234
GESTURE,LEFT,0.87,RELAY,0,-840,620,15980
GESTURE,IDLE,0.98,RELAY,0,1210,-510,16190
```

## Troubleshooting

### "Port busy" / "Access denied"
- **Close Arduino Serial Monitor** completely
- Close any other terminal using the COM port (PuTTY, Tera Term, etc.)
- Disconnect and reconnect ESP32 USB cable
- Try "Connect" again

### "No ports found"
- Install ESP32 USB drivers (CP210x or CH340)
- Check Device Manager → Ports (COM & LPT)
- Try different USB cable (some are charge-only)

### Dashboard doesn't update
- Verify ESP32 is sending data (open Arduino Serial Monitor briefly to confirm)
- Check baud rate matches (default 115200)
- Check wiring: MPU6050 SDA=GPIO21, SCL=GPIO22

### Graph frozen / UI lag
- Restart the dashboard (`Ctrl+C` then `streamlit run app.py`)
- Reduce serial output frequency on ESP32 if too fast

### Malformed data / errors increasing
- Some noise on serial line is normal
- Error counter increments for invalid packets — UI stays responsive
- Check ESP32 firmware serial print format matches expected protocol

## Project Structure

```
TinyGest_Interface/
├── app.py              # Main Streamlit dashboard
├── serial_reader.py    # Serial communication {real + mock}
├── parser.py           # Serial line parsing & validation
├── requirements.txt    # Python dependencies
└── README.md           # This file
```

## Key Design Principles

- **Simple & Reliable** — No cloud, no database, no auth
- **Local Only** — Runs entirely on your laptop
- **Mock Mode** — Develop/demo without hardware
- **Robust Parsing** — Handles malformed/missing data gracefully
- **Bounded Buffers** — Rolling 200-sample window for graphs
- **Non-blocking UI** — Threaded serial reading

## Safety Notes

- **Demo loads only**: Use low-voltage loads (LED, small DC fan) for relay demonstration
- **Not medical grade** — Academic prototype only
- **ESP32 controls relay** — Dashboard only displays state
