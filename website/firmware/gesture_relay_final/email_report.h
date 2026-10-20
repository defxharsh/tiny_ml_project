/*
  TinyGest — caregiver email reports via EmailJS.

  Reports are queued and sent by a background FreeRTOS task, so Wi-Fi/HTTPS
  never blocks gesture sampling or the MAX30100 update loop.

  EmailJS template variables:
    patient_id, time, gesture, heart_rate, spo2, alert_status, action_taken
*/
#ifndef EMAIL_REPORT_H
#define EMAIL_REPORT_H

#include <Arduino.h>

// Call once from setup(). Returns immediately; Wi-Fi connects in the background.
void initEmailReporting();

// Queue a report. Returns true if it was accepted (not rate-limited, queue not full).
//   heartRate / spo2    : values shown to the dashboard
//   vitalsAreReal       : false if they were substituted because the sensor had no valid reading
bool sendPatientReport(const char* gesture, float heartRate, float spo2,
                       bool vitalsAreReal, const char* alertStatus,
                       const char* actionTaken, bool isVitalsAlert);

#endif
