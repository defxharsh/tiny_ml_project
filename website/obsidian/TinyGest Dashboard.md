# 🖥️ TinyGest Dashboard

> Real-time ESP32 Smart Wristband Dashboard for voice and gesture control monitoring.

## Overview

TinyGest is a web-based dashboard that connects directly to an ESP32 smart wristband via **Web Serial API** (USB). It visualizes live sensor data, recognized voice commands, detected gestures, and system events in a premium dark-themed interface.

## Quick Links

- [[Architecture]] — System design and data flow
- [[Setup Guide]] — Installation and connection instructions
- [[Serial Protocol]] — Message formats and parser documentation
- [[Troubleshooting]] — Common issues and solutions
- [[Component Reference]] — UI component documentation
- [[Session Log]] — Development session notes

## Key Features

- 🔌 **Web Serial API** — Direct USB connection, no bridge needed
- 📊 **Live Charts** — Real-time sensor visualization with Recharts
- 🎙️ **Voice Control** — Command detection and frequency analysis
- ✋ **Gesture Control** — Gesture detection with visual feedback
- 📜 **Event Timeline** — Color-coded activity feed
- 🖥️ **Serial Console** — Raw debug output with pause/resume
- 📥 **CSV Export** — Download session data
- 🎭 **Demo Mode** — UI testing without hardware

## Tech Stack

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite 5 | Build tool |
| Tailwind CSS 3 | Styling |
| Recharts | Charts |
| Zustand | State management |
| Lucide React | Icons |
| Web Serial API | USB serial communication |

## Status

- [x] Project scaffolding
- [x] Web Serial connection manager
- [x] Flexible serial parser
- [x] Dashboard UI components
- [x] Demo mode
- [ ] ESP32 sketch integration (awaiting code files)
- [ ] Production deployment

---
*Last updated: {{date}}*
