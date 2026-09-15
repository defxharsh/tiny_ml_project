# TinyGest Interface

A real-time monitoring dashboard for the **TinyGest** assistive interface system — a TinyML-based gesture recognition system running on ESP32 with MPU6050 accelerometer.

## Overview

This Python/Streamlit application provides a local desktop interface to monitor the TinyGest hardware system:

- **ESP32** reads MPU6050 sensor data via I2C
- **Edge Impulse TinyML model** (quantized int8) runs inference on-device
- **5 gesture classes**: `DOWN`, `IDLE`, `LEFT`, `RIGHT`, `UP`
- **Relay control** based on gesture recognition
- **Serial output** sent to PC/Mac for visualization
- **Streamlit dashboard** displays live gesture predictions and sensor data

---

## Requirements

### Software

- **Python 3.9+**
- **Windows 10/11** or **macOS**
- **pip**
- **ESP32 USB drivers** if required
- **Arduino IDE** for ESP32 firmware/hardware setup

### Hardware

- ESP32 development board
- MPU6050 accelerometer/gyroscope
- Relay module
- USB cable
- Optional low-voltage load such as an LED or small DC fan

---

# Installation

## 1. Clone / Navigate to Project

Open **Command Prompt / PowerShell** on Windows or **Terminal** on macOS.

```bash
cd TinyGest_Interface
```

---

## 2. Create Virtual Environment

### Windows

```cmd
python -m venv .venv
```

If `python` is not recognized, try:

```cmd
py -m venv .venv
```

### macOS

```bash
python3 -m venv .venv
```

---

## 3. Activate Virtual Environment

### Windows — Command Prompt

```cmd
.venv\Scripts\activate
```

### Windows — PowerShell

```powershell
.venv\Scripts\Activate.ps1
```

If PowerShell blocks script execution, you can activate using Command Prompt instead.

### macOS

```bash
source .venv/bin/activate
```

After activation, you should see something similar to:

```text
(.venv)
```

at the beginning of your terminal prompt.

---

## 4. Install Dependencies

With the virtual environment activated:

### Windows

```cmd
pip install -r requirements.txt
```

### macOS

```bash
pip install -r requirements.txt
```

You can also use:

```bash
python -m pip install -r requirements.txt
```

on Windows, or:

```bash
python3 -m pip install -r requirements.txt
```

on macOS.

---

# Running the Dashboard

Make sure the virtual environment is activated.

### Windows

```cmd
streamlit run app.py
```

### macOS

```bash
streamlit run app.py
```

The dashboard should open in your default browser.

If it does not open automatically, visit:

```text
http://localhost:8501
```

The dashboard runs **locally on your computer** and does not require cloud services.

---

# Usage

## Demo / Mock Mode — No Hardware Required

Demo mode allows you to test the dashboard without an ESP32.

1. Open the dashboard.
2. Check **"Demo / Mock Mode"** in the sidebar.
3. Click **"Start Mock"**.
4. The dashboard will display:
   - Simulated gesture predictions
   - Confidence values
   - Relay states
   - Accelerometer values
   - Real-time graphs
5. The dashboard is clearly labeled **"DEMO / MOCK MODE"**.

> **Important:** Mock data must never be interpreted as real sensor or hardware data.

---

# Real Hardware Mode

## 1. Connect ESP32

Connect the ESP32 to your computer using a USB cable.

### Windows

The ESP32 usually appears as a COM port such as:

```text
COM3
COM4
COM5
```

You can check:

**Device Manager → Ports (COM & LPT)**

### macOS

The ESP32 usually appears as a serial device such as:

```text
/dev/cu.usbserial-0001
/dev/cu.SLAB_USBtoUART
/dev/cu.wchusbserialXXXX
```

To list available serial devices:

```bash
ls /dev/cu.*
```

You can also use:

```bash
ls /dev/tty.*
```

For most ESP32 boards, prefer the `/dev/cu.*` device.

---

## 2. Close Arduino Serial Monitor

**The serial port can generally only be used by one application at a time.**

Before connecting the TinyGest dashboard:

- Close Arduino Serial Monitor
- Close Arduino Serial Plotter
- Close PuTTY
- Close Tera Term
- Close any other application using the ESP32 serial port

---

## 3. Configure Dashboard

1. Uncheck **"Demo / Mock Mode"**
2. Select the ESP32 serial port.
3. Confirm:

```text
Baud Rate: 115200
```

4. Click **"Connect"**
5. The dashboard should begin displaying live ESP32 data.

---

# Finding the ESP32 Port

## Windows

Open:

**Device Manager → Ports (COM & LPT)**

Look for something similar to:

```text
Silicon Labs CP210x USB to UART Bridge (COM5)
```

or:

```text
USB-SERIAL CH340 (COM5)
```

The required port is:

```text
COM5
```

---

## macOS

Open Terminal:

```bash
ls /dev/cu.*
```

Example:

```text
/dev/cu.Bluetooth-Incoming-Port
/dev/cu.SLAB_USBtoUART
```

If you unplug the ESP32 and run:

```bash
ls /dev/cu.*
```

then reconnect it and run the command again, the newly appearing device is usually your ESP32.

---

# Expected Serial Protocol

The ESP32 should send CSV lines in this format:

```text
GESTURE,<label>,<confidence>,RELAY,<state>,<acc_x>,<acc_y>,<acc_z>
```

| Field | Description | Example |
|---|---|---|
| 0 | Fixed: `GESTURE` | `GESTURE` |
| 1 | Gesture label | `RIGHT` |
| 2 | Confidence (0–1) | `0.92` |
| 3 | Fixed: `RELAY` | `RELAY` |
| 4 | Relay state (0/1) | `1` |
| 5 | Acc X (raw) | `1245` |
| 6 | Acc Y (raw) | `-532` |
| 7 | Acc Z (raw) | `16234` |

### Valid Gestures

```text
DOWN
IDLE
LEFT
RIGHT
UP
```

### Examples

```text
GESTURE,RIGHT,0.92,RELAY,1,1245,-532,16234
GESTURE,LEFT,0.87,RELAY,0,-840,620,15980
GESTURE,IDLE,0.98,RELAY,0,1210,-510,16190
```

---

# Troubleshooting

## "Port busy" / "Access denied"

### Windows

- Close Arduino Serial Monitor completely.
- Close Arduino Serial Plotter.
- Close PuTTY, Tera Term, or other serial applications.
- Check whether another terminal/application is using the COM port.
- Disconnect and reconnect the ESP32.
- Try connecting again.
- Check **Task Manager** if a background application may still be using the port.

### macOS

- Close Arduino Serial Monitor completely.
- Close Arduino Serial Plotter.
- Close other serial terminal applications.
- Disconnect and reconnect the ESP32.
- Check available devices:

```bash
ls /dev/cu.*
```

- Select the correct `/dev/cu.*` port in the dashboard.
- If necessary, restart the dashboard.

---

# "No ports found"

## Windows

Check:

**Device Manager → Ports (COM & LPT)**

If the ESP32 does not appear:

- Install the appropriate USB-to-UART driver.
- Common chips include:
  - CP210x
  - CH340/CH341
- Try another USB cable.
- Make sure the cable supports **data**, not just charging.
- Try another USB port.

---

## macOS

Run:

```bash
ls /dev/cu.*
```

If no ESP32-related device appears:

- Install the required USB-to-UART driver if your board requires one.
- Common USB chips include CP210x and CH340.
- Try another USB cable.
- Make sure the cable supports data transfer.
- Try another USB port/adapter.
- Disconnect and reconnect the ESP32.

> Some newer ESP32 boards use native USB and may not require a separate USB-to-UART driver.

---

# Dashboard Doesn't Update

Check the following:

### 1. ESP32 is connected

Make sure the board is detected by Windows/macOS.

### 2. Correct serial port

Windows:

```text
COMx
```

macOS:

```text
/dev/cu.*
```

### 3. Correct baud rate

Default:

```text
115200
```

### 4. ESP32 is sending data

You can temporarily open Arduino Serial Monitor to verify the output.

**Remember to close Serial Monitor again before connecting the Streamlit dashboard.**

### 5. Check MPU6050 wiring

Default TinyGest configuration:

```text
MPU6050 SDA → ESP32 GPIO21
MPU6050 SCL → ESP32 GPIO22
```

---

# Graph Frozen / UI Lag

If the dashboard becomes slow or graphs stop updating:

1. Stop the dashboard:

```text
Ctrl + C
```

2. Restart:

```bash
streamlit run app.py
```

3. Reduce serial output frequency on the ESP32 if data is being sent too rapidly.
4. Check whether another application is consuming the serial port.

---

# Malformed Data / Error Counter Increasing

Some noise on the serial line may be normal.

The parser should:

- Ignore invalid packets
- Prevent malformed data from crashing the dashboard
- Increment the error counter
- Keep the UI responsive

Check that the ESP32 firmware follows the expected format:

```text
GESTURE,<label>,<confidence>,RELAY,<state>,<acc_x>,<acc_y>,<acc_z>
```

Example:

```text
GESTURE,RIGHT,0.92,RELAY,1,1245,-532,16234
```

---

# macOS Permission Issues

If macOS reports a permission-related serial error, first make sure no other application is using the port.

You can inspect the available devices with:

```bash
ls -l /dev/cu.*
```

Then restart the dashboard after reconnecting the ESP32.

Avoid manually changing device permissions unless necessary.

---

# Stopping the Dashboard

Press:

```text
Ctrl + C
```

in the terminal running Streamlit.

To deactivate the Python virtual environment:

### Windows

```cmd
deactivate
```

### macOS

```bash
deactivate
```

---

# Project Structure

```text
TinyGest_Interface/
├── app.py              # Main Streamlit dashboard
├── serial_reader.py    # Serial communication {real + mock}
├── parser.py           # Serial line parsing & validation
├── requirements.txt    # Python dependencies
└── README.md            # This file
```

---

# System Architecture

```text
                 ┌────────────────────┐
                 │      MPU6050       │
                 │ Accelerometer Data │
                 └─────────┬──────────┘
                           │ I2C
                           ▼
                 ┌────────────────────┐
                 │       ESP32        │
                 │                    │
                 │ Edge Impulse       │
                 │ TinyML Model       │
                 └─────────┬──────────┘
                           │
                           │ Gesture + Confidence
                           │ + Relay + Acceleration
                           ▼
                 ┌────────────────────┐
                 │   USB Serial       │
                 │    115200 baud     │
                 └─────────┬──────────┘
                           │
                 ┌─────────┴──────────┐
                 │                    │
             Windows                 macOS
             COMx                 /dev/cu.*
                 │                    │
                 └─────────┬──────────┘
                           ▼
                 ┌────────────────────┐
                 │ Python + Streamlit │
                 │                    │
                 │ • Gesture          │
                 │ • Confidence       │
                 │ • Relay Status     │
                 │ • Accelerometer    │
                 │ • Live Graphs      │
                 └────────────────────┘
```

---

# Key Design Principles

### Simple & Reliable

No cloud, database, or authentication is required.

### Local Only

The dashboard runs entirely on the user's Windows PC or Mac.

### Cross-Platform

Supports:

- Windows 10/11
- macOS

### Mock Mode

Allows development and demonstrations without hardware.

### Robust Parsing

Handles malformed or missing serial data gracefully.

### Bounded Buffers

Uses a rolling **200-sample window** for accelerometer graphs.

### Non-Blocking UI

Uses threaded serial reading to prevent the Streamlit interface from becoming unresponsive.

---

# Safety Notes

> **Demo loads only:** Use low-voltage loads such as an LED or small DC fan for relay demonstrations.

> **Not medical grade:** TinyGest is an academic/prototype system and must not be treated as a medical device.

> **ESP32 controls relay:** The Streamlit dashboard only displays the relay state and does not directly control the physical relay unless explicitly implemented in the firmware/protocol.

---

# Quick Start

## Windows

```cmd
cd TinyGest_Interface
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

If required:

```cmd
py -m venv .venv
```

---

## macOS

```bash
cd TinyGest_Interface
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

Find the ESP32 serial port:

```bash
ls /dev/cu.*
```

Then select the appropriate `/dev/cu.*` device in the TinyGest dashboard.

---

# Quick Reference

| Task | Windows | macOS |
|---|---|---|
| Python | `python` / `py` | `python3` |
| Create venv | `python -m venv .venv` | `python3 -m venv .venv` |
| Activate venv | `.venv\Scripts\activate` | `source .venv/bin/activate` |
| Install packages | `pip install -r requirements.txt` | `pip install -r requirements.txt` |
| Run dashboard | `streamlit run app.py` | `streamlit run app.py` |
| Serial port | `COM3`, `COM4`, etc. | `/dev/cu.*` |
| Port discovery | Device Manager | `ls /dev/cu.*` |
| Stop dashboard | `Ctrl+C` | `Ctrl+C` |
| Deactivate venv | `deactivate` | `deactivate` |

---

## TinyGest Workflow

```text
ESP32 + MPU6050
       ↓
Sensor Data
       ↓
Edge Impulse TinyML
       ↓
Gesture Prediction
       ↓
Relay Decision
       ↓
Serial CSV Output
       ↓
Windows / macOS
       ↓
Python Serial Reader
       ↓
Parser + Validation
       ↓
Streamlit Dashboard
       ↓
Live Gesture + Confidence
+ Relay Status + Accelerometer Graphs
```
