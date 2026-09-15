import serial
import serial.tools.list_ports
import threading
import time
import random
from typing import Optional, Callable, List
from queue import Queue, Empty
from dataclasses import dataclass, field


class SerialReader:
    def __init__(self, port: str, baudrate: int = 115200, timeout: float = 1.0):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.serial_conn: Optional[serial.Serial] = None
        self.running = False
        self.read_thread: Optional[threading.Thread] = None
        self.line_queue: Queue = Queue(maxsize=1000)
        self.error_callback: Optional[Callable[[str], None]] = None
        self._lock = threading.Lock()
    
    @staticmethod
    def list_ports() -> List[str]:
        ports = serial.tools.list_ports.comports()
        return [port.device for port in ports]
    
    def connect(self) -> bool:
        with self._lock:
            if self.serial_conn and self.serial_conn.is_open:
                return True
            
            try:
                self.serial_conn = serial.Serial(
                    port=self.port,
                    baudrate=self.baudrate,
                    timeout=self.timeout,
                    write_timeout=1.0
                )
                time.sleep(0.5)
                return True
            except serial.SerialException as e:
                if self.error_callback:
                    self.error_callback(f"Connection failed: {e}")
                self.serial_conn = None
                return False
            except Exception as e:
                if self.error_callback:
                    self.error_callback(f"Unexpected error: {e}")
                self.serial_conn = None
                return False
    
    def disconnect(self):
        self.running = False
        with self._lock:
            if self.serial_conn and self.serial_conn.is_open:
                try:
                    self.serial_conn.close()
                except Exception:
                    pass
            self.serial_conn = None
        
        if self.read_thread and self.read_thread.is_alive():
            self.read_thread.join(timeout=1.0)
    
    def is_connected(self) -> bool:
        with self._lock:
            return self.serial_conn is not None and self.serial_conn.is_open
    
    def start_reading(self, line_callback: Optional[Callable[[str], None]] = None):
        if self.running:
            return
        
        self.running = True
        self.read_thread = threading.Thread(target=self._read_loop, args=(line_callback,), daemon=True)
        self.read_thread.start()
    
    def _read_loop(self, line_callback: Optional[Callable[[str], None]] = None):
        buffer = ""
        
        while self.running:
            with self._lock:
                conn = self.serial_conn
            
            if not conn or not conn.is_open:
                time.sleep(0.1)
                continue
            
            try:
                if conn.in_waiting > 0:
                    data = conn.read(conn.in_waiting).decode('utf-8', errors='ignore')
                    buffer += data
                    
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.strip()
                        if line:
                            try:
                                self.line_queue.put_nowait(line)
                            except:
                                pass
                            if line_callback:
                                try:
                                    line_callback(line)
                                except Exception:
                                    pass
                else:
                    time.sleep(0.01)
                    
            except serial.SerialException as e:
                if self.error_callback:
                    self.error_callback(f"Serial error: {e}")
                break
            except Exception as e:
                if self.error_callback:
                    self.error_callback(f"Read error: {e}")
                time.sleep(0.1)
        
        self.running = False
    
    def get_latest_line(self) -> Optional[str]:
        try:
            return self.line_queue.get_nowait()
        except Empty:
            return None
    
    def get_all_lines(self) -> List[str]:
        lines = []
        while True:
            try:
                lines.append(self.line_queue.get_nowait())
            except Empty:
                break
        return lines
    
    def clear_queue(self):
        while True:
            try:
                self.line_queue.get_nowait()
            except Empty:
                break
    
    def send_command(self, command: str) -> bool:
        with self._lock:
            if self.serial_conn and self.serial_conn.is_open:
                try:
                    self.serial_conn.write((command + '\n').encode('utf-8'))
                    return True
                except Exception as e:
                    if self.error_callback:
                        self.error_callback(f"Send error: {e}")
        return False


@dataclass
class GestureRange:
    x_min: int
    x_max: int
    y_min: int
    y_max: int
    z_min: int
    z_max: int


GESTURE_RANGES = {
    "IDLE": GestureRange(-2400, -2000, 1200, 1800, 16500, 17500),
    "UP": GestureRange(-1600, -1200, 7000, 8000, 14500, 15500),
    "DOWN": GestureRange(-1600, -1200, 8500, 9500, 11500, 12500),
    "LEFT": GestureRange(-2800, -2200, 2000, 3000, 16000, 17000),
    "RIGHT": GestureRange(-1000, -400, 2000, 3000, 16000, 17000),
}


@dataclass
class VitalSigns:
    heart_rate: int = 72
    spo2: int = 98
    ppg_raw: int = 12500
    ppg_filtered: int = 12500
    timestamp: float = 0.0


@dataclass
class SensorState:
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    target_x: float = 0.0
    target_y: float = 0.0
    target_z: float = 0.0


class MockSerialReader:
    def __init__(self):
        self.running = False
        self.read_thread: Optional[threading.Thread] = None
        self.line_queue: Queue = Queue(maxsize=1000)
        self.error_callback: Optional[Callable[[str], None]] = None
        
        self.gestures = ["IDLE", "UP", "DOWN", "LEFT", "RIGHT"]
        self.gesture_index = 0
        self.current_gesture = "IDLE"
        self.gesture_duration = 0
        self.gesture_change_interval = 40
        
        self.hr = 72
        self.hr_target = 72
        self.spo2 = 98
        self.ppg_raw = 12500
        self.ppg_phase = 0.0
        
        self.sensor_state = SensorState()
        self._init_sensor_state()
        
        self.vital_mode = False
        self.vital_counter = 0
        
        self.sampling_rate = 50
        self.dt = 1.0 / self.sampling_rate
        self.smoothing_factor = 0.15
        self.noise_scale = 0.03
    
    def _init_sensor_state(self):
        r = GESTURE_RANGES["IDLE"]
        self.sensor_state.x = random.uniform(r.x_min, r.x_max)
        self.sensor_state.y = random.uniform(r.y_min, r.y_max)
        self.sensor_state.z = random.uniform(r.z_min, r.z_max)
        self.sensor_state.target_x = self.sensor_state.x
        self.sensor_state.target_y = self.sensor_state.y
        self.sensor_state.target_z = self.sensor_state.z
    
    def connect(self) -> bool:
        return True
    
    def disconnect(self):
        self.running = False
        if self.read_thread and self.read_thread.is_alive():
            self.read_thread.join(timeout=1.0)
    
    def is_connected(self) -> bool:
        return self.running
    
    def start_reading(self, line_callback: Optional[Callable[[str], None]] = None):
        if self.running:
            return
        
        self.running = True
        self.read_thread = threading.Thread(target=self._mock_loop, args=(line_callback,), daemon=True)
        self.read_thread.start()
    
    def _update_sensor_state(self):
        r = GESTURE_RANGES[self.current_gesture]
        
        self.sensor_state.target_x += random.uniform(-1, 1) * (r.x_max - r.x_min) * self.noise_scale
        self.sensor_state.target_y += random.uniform(-1, 1) * (r.y_max - r.y_min) * self.noise_scale
        self.sensor_state.target_z += random.uniform(-1, 1) * (r.z_max - r.z_min) * self.noise_scale
        
        self.sensor_state.target_x = max(r.x_min, min(r.x_max, self.sensor_state.target_x))
        self.sensor_state.target_y = max(r.y_min, min(r.y_max, self.sensor_state.target_y))
        self.sensor_state.target_z = max(r.z_min, min(r.z_max, self.sensor_state.target_z))
        
        alpha = self.smoothing_factor
        self.sensor_state.x += alpha * (self.sensor_state.target_x - self.sensor_state.x)
        self.sensor_state.y += alpha * (self.sensor_state.target_y - self.sensor_state.y)
        self.sensor_state.z += alpha * (self.sensor_state.target_z - self.sensor_state.z)
        
        if self.gesture_duration > self.gesture_change_interval * 0.7:
            next_idx = (self.gestures.index(self.current_gesture) + 1) % len(self.gestures)
            next_gesture = self.gestures[next_idx]
            nr = GESTURE_RANGES[next_gesture]
            blend = (self.gesture_duration - self.gesture_change_interval * 0.7) / (self.gesture_change_interval * 0.3)
            blend = min(1.0, max(0.0, blend))
            
            self.sensor_state.target_x = (1 - blend) * self.sensor_state.target_x + blend * random.uniform(nr.x_min, nr.x_max)
            self.sensor_state.target_y = (1 - blend) * self.sensor_state.target_y + blend * random.uniform(nr.y_min, nr.y_max)
            self.sensor_state.target_z = (1 - blend) * self.sensor_state.target_z + blend * random.uniform(nr.z_min, nr.z_max)
    
    def _maybe_change_gesture(self):
        self.gesture_duration += 1
        if self.gesture_duration >= self.gesture_change_interval:
            self.gesture_index = (self.gesture_index + 1) % len(self.gestures)
            self.current_gesture = self.gestures[self.gesture_index]
            self.gesture_duration = 0
            self.gesture_change_interval = random.randint(35, 55)
            
            r = GESTURE_RANGES[self.current_gesture]
            self.sensor_state.target_x = random.uniform(r.x_min, r.x_max)
            self.sensor_state.target_y = random.uniform(r.y_min, r.y_max)
            self.sensor_state.target_z = random.uniform(r.z_min, r.z_max)
    
    def _generate_vitals_line(self) -> str:
        self.ppg_phase += 2 * 3.14159 * (self.hr / 60.0) * self.dt
        if self.ppg_phase > 2 * 3.14159:
            self.ppg_phase -= 2 * 3.14159
        
        self.hr_target += random.uniform(-0.5, 0.5)
        self.hr_target = max(55, min(110, self.hr_target))
        self.hr += 0.1 * (self.hr_target - self.hr)
        self.hr = max(55, min(110, self.hr))
        
        self.spo2 += random.uniform(-0.05, 0.05)
        self.spo2 = max(94, min(100, self.spo2))
        
        ppg_signal = 300 * (0.5 + 0.5 * (1 - self.ppg_phase / (2 * 3.14159)) if self.ppg_phase < 3.14159 else 0.5 - 0.5 * (self.ppg_phase - 3.14159) / 3.14159)
        ppg_signal += random.uniform(-20, 20)
        self.ppg_raw = int(12500 + ppg_signal)
        self.ppg_filtered = int(12500 + ppg_signal * 0.7)
        
        self.vital_counter += 1
        
        return f"VITALS,HR,{int(self.hr)},SPO2,{int(self.spo2)},PPG_RAW,{self.ppg_raw},PPG_FILT,{self.ppg_filtered}"
    
    def _generate_gesture_line(self) -> str:
        confidence = 0.85 + random.random() * 0.14
        relay_state = 1 if self.current_gesture in ("RIGHT", "UP") else 0
        
        acc_x = int(self.sensor_state.x)
        acc_y = int(self.sensor_state.y)
        acc_z = int(self.sensor_state.z)
        
        return f"GESTURE,{self.current_gesture},{confidence:.2f},RELAY,{relay_state},{acc_x},{acc_y},{acc_z}"
    
    def _mock_loop(self, line_callback: Optional[Callable[[str], None]] = None):
        while self.running:
            if self.vital_mode:
                line = self._generate_vitals_line()
            else:
                self._maybe_change_gesture()
                self._update_sensor_state()
                line = self._generate_gesture_line()
            
            try:
                self.line_queue.put_nowait(line)
            except:
                pass
            
            if line_callback:
                try:
                    line_callback(line)
                except Exception:
                    pass
            
            time.sleep(self.dt)
    
    def set_vital_mode(self, enabled: bool):
        self.vital_mode = enabled
    
    def get_latest_line(self) -> Optional[str]:
        try:
            return self.line_queue.get_nowait()
        except Empty:
            return None
    
    def get_all_lines(self) -> List[str]:
        lines = []
        while True:
            try:
                lines.append(self.line_queue.get_nowait())
            except Empty:
                break
        return lines
    
    def clear_queue(self):
        while True:
            try:
                self.line_queue.get_nowait()
            except Empty:
                break
    
    def send_command(self, command: str) -> bool:
        return False
    
    @staticmethod
    def list_ports() -> List[str]:
        return ["MOCK_COM1", "MOCK_COM2"]


class MockVitalsReader:
    def __init__(self):
        self.running = False
        self.read_thread: Optional[threading.Thread] = None
        self.line_queue: Queue = Queue(maxsize=1000)
        self.error_callback: Optional[Callable[[str], None]] = None
        
        self.hr = 72
        self.hr_target = 72
        self.spo2 = 98
        self.ppg_raw = 12500
        self.ppg_phase = 0.0
        self.vital_counter = 0
        self.sampling_rate = 50
        self.dt = 1.0 / self.sampling_rate
    
    def connect(self) -> bool:
        return True
    
    def disconnect(self):
        self.running = False
        if self.read_thread and self.read_thread.is_alive():
            self.read_thread.join(timeout=1.0)
    
    def is_connected(self) -> bool:
        return self.running
    
    def start_reading(self, line_callback: Optional[Callable[[str], None]] = None):
        if self.running:
            return
        
        self.running = True
        self.read_thread = threading.Thread(target=self._mock_loop, args=(line_callback,), daemon=True)
        self.read_thread.start()
    
    def _mock_loop(self, line_callback: Optional[Callable[[str], None]] = None):
        while self.running:
            self.ppg_phase += 2 * 3.14159 * (self.hr / 60.0) * self.dt
            if self.ppg_phase > 2 * 3.14159:
                self.ppg_phase -= 2 * 3.14159
            
            self.hr_target += random.uniform(-0.5, 0.5)
            self.hr_target = max(55, min(110, self.hr_target))
            self.hr += 0.1 * (self.hr_target - self.hr)
            self.hr = max(55, min(110, self.hr))
            
            self.spo2 += random.uniform(-0.05, 0.05)
            self.spo2 = max(94, min(100, self.spo2))
            
            ppg_signal = 300 * (0.5 + 0.5 * (1 - self.ppg_phase / (2 * 3.14159)) if self.ppg_phase < 3.14159 else 0.5 - 0.5 * (self.ppg_phase - 3.14159) / 3.14159)
            ppg_signal += random.uniform(-20, 20)
            self.ppg_raw = int(12500 + ppg_signal)
            ppg_filtered = int(12500 + ppg_signal * 0.7)
            
            self.vital_counter += 1
            
            line = f"VITALS,HR,{int(self.hr)},SPO2,{int(self.spo2)},PPG_RAW,{self.ppg_raw},PPG_FILT,{ppg_filtered}"
            
            try:
                self.line_queue.put_nowait(line)
            except:
                pass
            
            if line_callback:
                try:
                    line_callback(line)
                except Exception:
                    pass
            
            time.sleep(self.dt)
    
    def get_latest_line(self) -> Optional[str]:
        try:
            return self.line_queue.get_nowait()
        except Empty:
            return None
    
    def get_all_lines(self) -> List[str]:
        lines = []
        while True:
            try:
                lines.append(self.line_queue.get_nowait())
            except Empty:
                break
        return lines
    
    def clear_queue(self):
        while True:
            try:
                self.line_queue.get_nowait()
            except Empty:
                break
    
    def send_command(self, command: str) -> bool:
        return False
    
    @staticmethod
    def list_ports() -> List[str]:
        return ["MOCK_VITALS_COM1", "MOCK_VITALS_COM2"]