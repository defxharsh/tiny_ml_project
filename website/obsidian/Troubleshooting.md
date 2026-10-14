# 🔧 Troubleshooting

> Common issues and solutions for the TinyGest Dashboard.

## Connection Issues

### "Port is already in use"
> [!CAUTION]
> **Close the Arduino IDE Serial Monitor** before connecting.

Only one application can access a COM port at a time. Close any program that has the serial port open:
- Arduino IDE Serial Monitor
- PuTTY / Tera Term
- Other serial terminal apps
- Another browser tab running TinyGest

### "No serial port selected"
- You cancelled the port selection dialog
- Try again and select your ESP32's COM port

### "Web Serial API is not supported"
- Use **Chrome 89+** or **Edge 89+**
- Firefox and Safari do NOT support Web Serial API
- Use the Demo Mode to preview the UI

### ESP32 Not Appearing in Port List
1. Check the USB cable (use a data cable, not charge-only)
2. Install ESP32 USB drivers:
   - CP2102: [Silicon Labs driver](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers)
   - CH340: [WCH driver](https://www.wch.cn/downloads/CH341SER_EXE.html)
3. Check Device Manager → Ports (COM & LPT)
4. Try a different USB port

### Data Not Showing
- Verify the **baud rate** matches `Serial.begin()` in your sketch
- Verify the **operating mode** matches the uploaded firmware
- Check the raw serial console (expand it) to see if data arrives
- Confirm the ESP32 is actually running (LED blinking, etc.)

## Parsing Issues

### "All messages show as unparsed"
- The serial output format may not match the generic parser
- Provide your ESP32 sketches so the parser can be customized
- Check the raw console to see the actual format

### Garbled Characters
- **Wrong baud rate** — Most common cause
- Try 115200 (most common ESP32 default)
- Match exactly what your `Serial.begin()` uses

## Chart Issues

### Charts Not Updating
- Check if display is paused (yellow "PAUSED" badge)
- Check if the serial data contains numeric KEY:VALUE pairs
- Text commands won't appear as chart data (by design)

### High Memory Usage
- Reduce chart history points in Settings (default: 200)
- Clear the raw console periodically

## Browser Issues

### Permission Denied
- Chrome may need serial port permissions
- Go to `chrome://settings/content/serialPorts` to check
- Try in an Incognito window

### Page Freezes During High-Speed Data
- Reduce the ESP32 serial output rate
- Add a small `delay()` in your Arduino loop
- Reduce chart history points

## Related

- [[Setup Guide]]
- [[Serial Protocol]]
- [[TinyGest Dashboard]]
