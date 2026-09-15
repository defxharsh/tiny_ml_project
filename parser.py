import re
from typing import Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class ParsedData:
    gesture: Optional[str] = None
    confidence: Optional[float] = None
    relay_state: Optional[int] = None
    acc_x: Optional[int] = None
    acc_y: Optional[int] = None
    acc_z: Optional[int] = None
    raw_line: str = ""
    valid: bool = False


@dataclass
class VitalsData:
    heart_rate: Optional[int] = None
    spo2: Optional[int] = None
    ppg_raw: Optional[int] = None
    ppg_filtered: Optional[int] = None
    raw_line: str = ""
    valid: bool = False


VALID_GESTURES = {"DOWN", "IDLE", "LEFT", "RIGHT", "UP"}


def parse_line(line: str) -> ParsedData:
    """
    Parse a single TinyGest serial line.
    Expected format: GESTURE,<label>,<confidence>,RELAY,<state>,<acc_x>,<acc_y>,<acc_z>
    Example: GESTURE,RIGHT,0.92,RELAY,1,1245,-532,16234
    """
    result = ParsedData(raw_line=line.strip())
    
    if not line or not line.strip():
        return result
    
    line = line.strip()
    
    if not line.startswith("GESTURE,"):
        return result
    
    parts = line.split(",")
    
    if len(parts) != 8:
        return result
    
    try:
        if parts[0] != "GESTURE" or parts[3] != "RELAY":
            return result
        
        gesture = parts[1].upper()
        if gesture not in VALID_GESTURES:
            return result
        
        confidence = float(parts[2])
        if not (0.0 <= confidence <= 1.0):
            return result
        
        relay_state = int(parts[4])
        if relay_state not in (0, 1):
            return result
        
        acc_x = int(parts[5])
        acc_y = int(parts[6])
        acc_z = int(parts[7])
        
        result.gesture = gesture
        result.confidence = confidence
        result.relay_state = relay_state
        result.acc_x = acc_x
        result.acc_y = acc_y
        result.acc_z = acc_z
        result.valid = True
        
    except (ValueError, IndexError):
        pass
    
    return result


def parse_line_flexible(line: str) -> ParsedData:
    """
    More flexible parser that tries to extract data even from slightly malformed lines.
    Falls back to strict parser first.
    """
    strict_result = parse_line(line)
    if strict_result.valid:
        return strict_result
    
    result = ParsedData(raw_line=line.strip())
    line = line.strip()
    
    if not line:
        return result
    
    parts = line.split(",")
    
    if len(parts) < 8:
        return result
    
    try:
        gesture_idx = -1
        relay_idx = -1
        
        for i, part in enumerate(parts):
            if part.upper() == "GESTURE":
                gesture_idx = i
            elif part.upper() == "RELAY":
                relay_idx = i
        
        if gesture_idx == -1 or relay_idx == -1:
            return result
        
        if gesture_idx + 1 >= len(parts) or gesture_idx + 2 >= len(parts):
            return result
        if relay_idx + 1 >= len(parts):
            return result
        
        gesture = parts[gesture_idx + 1].upper()
        if gesture not in VALID_GESTURES:
            return result
        
        confidence = float(parts[gesture_idx + 2])
        if not (0.0 <= confidence <= 1.0):
            return result
        
        relay_state = int(parts[relay_idx + 1])
        if relay_state not in (0, 1):
            return result
        
        acc_start = max(gesture_idx, relay_idx) + 2
        if acc_start + 2 >= len(parts):
            return result
        
        acc_x = int(parts[acc_start])
        acc_y = int(parts[acc_start + 1])
        acc_z = int(parts[acc_start + 2])
        
        result.gesture = gesture
        result.confidence = confidence
        result.relay_state = relay_state
        result.acc_x = acc_x
        result.acc_y = acc_y
        result.acc_z = acc_z
        result.valid = True
        
    except (ValueError, IndexError):
        pass
    
    return result


def parse_vitals_line(line: str) -> VitalsData:
    """
    Parse a vitals serial line.
    Expected format: VITALS,HR,<bpm>,SPO2,<pct>,PPG_RAW,<val>,PPG_FILT,<val>
    Example: VITALS,HR,72,SPO2,98,PPG_RAW,12500,PPG_FILT,12400
    """
    result = VitalsData(raw_line=line.strip())
    
    if not line or not line.strip():
        return result
    
    line = line.strip()
    
    if not line.startswith("VITALS,"):
        return result
    
    parts = line.split(",")
    
    if len(parts) != 9:
        return result
    
    try:
        if parts[0] != "VITALS" or parts[1] != "HR" or parts[3] != "SPO2" or parts[5] != "PPG_RAW" or parts[7] != "PPG_FILT":
            return result
        
        hr = int(parts[2])
        if not (30 <= hr <= 200):
            return result
        
        spo2 = int(parts[4])
        if not (70 <= spo2 <= 100):
            return result
        
        ppg_raw = int(parts[6])
        ppg_filtered = int(parts[8])
        
        result.heart_rate = hr
        result.spo2 = spo2
        result.ppg_raw = ppg_raw
        result.ppg_filtered = ppg_filtered
        result.valid = True
        
    except (ValueError, IndexError):
        pass
    
    return result