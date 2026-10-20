/*
  TinyGest — patient report settings (non-secret).
  Wi-Fi / EmailJS credentials live in secrets.h.
*/
#ifndef REPORT_CONFIG_H
#define REPORT_CONFIG_H

// Appears in every report sent to the caregiver.
#define PATIENT_ID "PATIENT-001"

// Timestamp offset from UTC. 19800 = India (IST, UTC+5:30).
#define REPORT_TZ_OFFSET_SEC 19800
#define REPORT_TZ_LABEL      "IST"

// Don't email the SAME gesture action again inside this window.
// (A different action, e.g. fan_on then fan_off, is always reported.)
#define GESTURE_REPORT_COOLDOWN_MS 30000UL
// Minimum gap between vitals-alert emails.
#define VITALS_REPORT_COOLDOWN_MS  300000UL

// Vitals alert thresholds, checked against the RAW MAX30100 reading
// (placeholder values — tune with real data).
#define HR_LOW_THRESHOLD   50.0f   // bpm
#define HR_HIGH_THRESHOLD  120.0f  // bpm
#define SPO2_LOW_THRESHOLD 90      // %
// Number of consecutive 1-second checks that must be abnormal before alerting.
#define VITALS_ALERT_CONFIRM_COUNT 3

#endif
