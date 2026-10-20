#include "email_report.h"
#include "report_config.h"
#include "secrets.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>

struct Report {
  char time[40];
  char gesture[24];
  char heartRate[24];
  char spo2[24];
  char alertStatus[40];
  char actionTaken[64];
};

static QueueHandle_t reportQueue = nullptr;
static unsigned long lastGestureReportMs = 0;
static unsigned long lastVitalsReportMs = 0;
static bool haveGestureReport = false, haveVitalsReport = false;
static char lastGestureKey[48] = "";

static bool isPlaceholder(const char* v) { return strstr(v, "YOUR_") != nullptr; }

static void makeTimestamp(char* out, size_t n) {
  struct tm t;
  if (getLocalTime(&t, 0)) {
    size_t len = strftime(out, n, "%Y-%m-%d %H:%M:%S ", &t);
    snprintf(out + len, n - len, "%s", REPORT_TZ_LABEL);
  } else {
    snprintf(out, n, "ESP32 uptime %lu s", millis() / 1000UL);
  }
}

static void jsonEscape(String& dst, const char* s) {
  for (; *s; s++) {
    if (*s == '"' || *s == '\\') { dst += '\\'; dst += *s; }
    else if ((uint8_t)*s < 0x20) dst += ' ';
    else dst += *s;
  }
}

static void addField(String& p, const char* key, const char* val, bool last = false) {
  p += '"'; p += key; p += "\":\"";
  jsonEscape(p, val);
  p += last ? "\"" : "\",";
}

static bool wifiConnect(unsigned long timeoutMs) {
  if (WiFi.status() == WL_CONNECTED) return true;
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < timeoutMs) vTaskDelay(pdMS_TO_TICKS(250));
  return WiFi.status() == WL_CONNECTED;
}

static bool postReport(const Report& r) {
  WiFiClientSecure client;
  // For a production medical deployment, pin the EmailJS root certificate instead.
  client.setInsecure();
  HTTPClient http;
  if (!http.begin(client, "https://api.emailjs.com/api/v1.0/email/send")) return false;
  http.addHeader("Content-Type", "application/json");

  String p;
  p.reserve(512);
  p += "{";
  addField(p, "service_id", EMAILJS_SERVICE_ID);
  addField(p, "template_id", EMAILJS_TEMPLATE_ID);
  addField(p, "user_id", EMAILJS_PUBLIC_KEY);
  p += "\"template_params\":{";
  addField(p, "patient_id", PATIENT_ID);
  addField(p, "time", r.time);
  addField(p, "gesture", r.gesture);
  addField(p, "heart_rate", r.heartRate);
  addField(p, "spo2", r.spo2);
  addField(p, "alert_status", r.alertStatus);
  addField(p, "action_taken", r.actionTaken, true);
  p += "}}";

  int status = http.POST(p);
  String resp = http.getString();
  http.end();
  if (status == 200) return true;
  Serial.printf("[ERROR] Report email failed (HTTP %d): %s\n", status, resp.c_str());
  return false;
}

static void reportTask(void*) {
  if (wifiConnect(15000)) {
    configTime(REPORT_TZ_OFFSET_SEC, 0, "pool.ntp.org", "time.nist.gov");
    Serial.println("[INFO] Report system: Wi-Fi connected");
  } else {
    Serial.println("[INFO] Report system: Wi-Fi not connected yet, will retry on first report");
  }

  Report r;
  for (;;) {
    if (xQueueReceive(reportQueue, &r, portMAX_DELAY) != pdTRUE) continue;
    bool ok = false;
    for (int attempt = 0; attempt < 2 && !ok; attempt++) {
      if (!wifiConnect(15000)) { Serial.println("[ERROR] Report skipped: no Wi-Fi"); continue; }
      ok = postReport(r);
    }
    if (ok) Serial.printf("[INFO] Report email sent: %s\n", r.alertStatus);
  }
}

void initEmailReporting() {
  if (isPlaceholder(WIFI_SSID) || isPlaceholder(WIFI_PASSWORD) ||
      isPlaceholder(EMAILJS_SERVICE_ID) || isPlaceholder(EMAILJS_TEMPLATE_ID) ||
      isPlaceholder(EMAILJS_PUBLIC_KEY)) {
    Serial.println("[INFO] Report system disabled: fill in secrets.h");
    return;
  }
  WiFi.mode(WIFI_STA);
  reportQueue = xQueueCreate(4, sizeof(Report));
  // Core 0 (with the Wi-Fi stack); Arduino loop() runs on core 1.
  xTaskCreatePinnedToCore(reportTask, "report", 12288, nullptr, 1, nullptr, 0);
}

bool sendPatientReport(const char* gesture, float heartRate, float spo2,
                       bool vitalsAreReal, const char* alertStatus,
                       const char* actionTaken, bool isVitalsAlert) {
  if (!reportQueue) return false;

  unsigned long now = millis();
  if (isVitalsAlert) {
    if (haveVitalsReport && now - lastVitalsReportMs < VITALS_REPORT_COOLDOWN_MS) return false;
  } else {
    char key[48];
    snprintf(key, sizeof(key), "%s|%s", gesture, actionTaken);
    if (haveGestureReport && strcmp(key, lastGestureKey) == 0 &&
        now - lastGestureReportMs < GESTURE_REPORT_COOLDOWN_MS) return false;
  }

  Report r;
  makeTimestamp(r.time, sizeof(r.time));
  snprintf(r.gesture, sizeof(r.gesture), "%s", gesture);
  snprintf(r.heartRate, sizeof(r.heartRate), vitalsAreReal ? "%.1f bpm" : "%.1f bpm (simulated)", heartRate);
  snprintf(r.spo2, sizeof(r.spo2), vitalsAreReal ? "%.0f %%" : "%.0f %% (simulated)", spo2);
  snprintf(r.alertStatus, sizeof(r.alertStatus), "%s", alertStatus);
  snprintf(r.actionTaken, sizeof(r.actionTaken), "%s", actionTaken);

  if (xQueueSend(reportQueue, &r, 0) != pdTRUE) return false;

  if (isVitalsAlert) { lastVitalsReportMs = now; haveVitalsReport = true; }
  else {
    lastGestureReportMs = now; haveGestureReport = true;
    snprintf(lastGestureKey, sizeof(lastGestureKey), "%s|%s", gesture, actionTaken);
  }
  Serial.printf("[INFO] Report queued: %s\n", alertStatus);
  return true;
}
