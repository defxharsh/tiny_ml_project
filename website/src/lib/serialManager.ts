/**
 * Serial Manager — Web Serial API wrapper.
 *
 * Reads bytes from the ESP32 USB serial port, buffers them into
 * complete lines, and invokes a callback for each line received.
 *
 * Only one instance should be active at a time.
 */

export type LineCallback = (line: string) => void;

export class SerialManager {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private decoder = new TextDecoder();
  private buffer = '';
  private running = false;
  private onLine: LineCallback;
  private onStatusChange: (connected: boolean) => void;

  constructor(onLine: LineCallback, onStatusChange: (connected: boolean) => void) {
    this.onLine = onLine;
    this.onStatusChange = onStatusChange;
  }

  /** Whether Web Serial API is supported in this browser */
  static isSupported(): boolean {
    return 'serial' in navigator;
  }

  /** Prompt user to select a serial port and open it */
  async connect(baudRate: number): Promise<void> {
    if (!SerialManager.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Use Chrome or Edge.');
    }

    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate, bufferSize: 8192 });
      this.running = true;
      this.onStatusChange(true);
      this.readLoop();
    } catch (err: any) {
      this.running = false;
      this.onStatusChange(false);
      if (err.name === 'NotFoundError') {
        throw new Error('No serial port selected.');
      }
      if (err.name === 'NetworkError') {
        throw new Error('Port is already in use by another application (e.g., Arduino IDE Serial Monitor). Close it first.');
      }
      throw new Error(`Connection failed: ${err.message}`);
    }
  }

  /** Disconnect from the serial port */
  async disconnect(): Promise<void> {
    this.running = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch {
      /* port may already be closed */
    }
    this.buffer = '';
    this.onStatusChange(false);
  }

  /** Whether currently connected */
  get isConnected(): boolean {
    return this.running && this.port !== null;
  }

  /* ── private ────────────────────────────────────────── */

  private async readLoop(): Promise<void> {
    if (!this.port?.readable) return;

    while (this.running && this.port.readable) {
      try {
        this.reader = this.port.readable.getReader();

        while (this.running) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) this.processBytes(value);
        }
      } catch (err: any) {
        /* USB disconnection throws here */
        if (this.running) {
          console.warn('[SerialManager] Read error:', err.message);
        }
      } finally {
        try {
          this.reader?.releaseLock();
        } catch { /* ignore */ }
        this.reader = null;
      }
    }

    /* If we exited the while-loop unexpectedly, signal disconnect */
    if (this.running) {
      this.running = false;
      this.onStatusChange(false);
    }
  }

  private processBytes(bytes: Uint8Array): void {
    this.buffer += this.decoder.decode(bytes, { stream: true });

    let newlineIdx: number;
    while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newlineIdx + 1);
      if (line.length > 0) {
        this.onLine(line);
      }
    }

    /* Prevent buffer from growing unbounded if no newlines arrive */
    if (this.buffer.length > 4096) {
      this.onLine(this.buffer);
      this.buffer = '';
    }
  }
}
