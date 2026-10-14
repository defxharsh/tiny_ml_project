
#include <Arduino.h>
#include <Wire.h>
#include <MAX30100_PulseOximeter.h>
#include <real_gesture_data_inferencing.h>

// ------------ MPU-6500 ----------------
#define MPU_ADDR 0x68
#define MPU_SDA 21
#define MPU_SCL 22

TwoWire MPUWire = TwoWire(1);

// ------------ MAX30100 ----------------
#define PULSE_SDA 18
#define PULSE_SCL 19

PulseOximeter pox;
bool pulseReady = false;

// ------------ RELAY -------------------
#define RELAY_PIN 13

// Active-LOW relay. Reverse these if your relay works oppositely.
#define FAN_ON  LOW
#define FAN_OFF HIGH

// ------------ MODEL -------------------
#define CONFIDENCE_THRESHOLD 0.65f
#define SAMPLE_COUNT EI_CLASSIFIER_RAW_SAMPLE_COUNT
#define SAMPLE_INTERVAL EI_CLASSIFIER_INTERVAL_MS

float features[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];

bool fanIsOn = false;
unsigned long lastVitalsPrint = 0;


// Read MPU-6500 accelerometer registers
bool readAccelerometer(int16_t &ax, int16_t &ay, int16_t &az)
{
    MPUWire.beginTransmission(MPU_ADDR);
    MPUWire.write(0x3B);

    if (MPUWire.endTransmission(false) != 0)
        return false;

    if (MPUWire.requestFrom(MPU_ADDR, 6, true) != 6)
        return false;

    ax = (int16_t)((MPUWire.read() << 8) | MPUWire.read());
    ay = (int16_t)((MPUWire.read() << 8) | MPUWire.read());
    az = (int16_t)((MPUWire.read() << 8) | MPUWire.read());

    return true;
}


// Supply collected samples to Edge Impulse
static int getSignalData(size_t offset, size_t length, float *outPtr)
{
    memcpy(outPtr, features + offset, length * sizeof(float));
    return 0;
}


// Collect 100 samples at 50 Hz
bool collectGesture()
{
    int16_t ax, ay, az;

    for (int i = 0; i < SAMPLE_COUNT; i++)
    {
        unsigned long start = millis();

        if (!readAccelerometer(ax, ay, az))
        {
            Serial.println("MPU read error!");
            return false;
        }

        features[i * 3]     = (float)ax;
        features[i * 3 + 1] = (float)ay;
        features[i * 3 + 2] = (float)az;

        unsigned long elapsed = millis() - start;

        while (elapsed < SAMPLE_INTERVAL)
        {
            if (pulseReady)
                pox.update();

            elapsed = millis() - start;
        }
    }

    return true;
}


// Set fan state
void setFan(bool turnOn)
{
    fanIsOn = turnOn;

    digitalWrite(RELAY_PIN, turnOn ? FAN_ON : FAN_OFF);

    if (turnOn)
        Serial.println("ACTION: FAN ON");
    else
        Serial.println("ACTION: FAN OFF");
}


// ------------ SETUP -------------------
void setup()
{
    Serial.begin(115200);
    delay(1000);

    pinMode(RELAY_PIN, OUTPUT);
    setFan(false);

    // MPU uses its own I2C bus
    MPUWire.begin(MPU_SDA, MPU_SCL, 100000);

    // Wake up MPU-6500
    MPUWire.beginTransmission(MPU_ADDR);
    MPUWire.write(0x6B);
    MPUWire.write(0x00);
    MPUWire.endTransmission();

    delay(100);

    Serial.println("\nTinyGest Gesture Fan Control");
    Serial.println("Model: real_gesture_data");
    Serial.println("Classes: fan_on, fan_off, idle");

    // MAX30100 uses the default Wire bus
    Wire.begin(PULSE_SDA, PULSE_SCL, 100000);

    if (pox.begin())
    {
        pulseReady = true;
        pox.setIRLedCurrent(MAX30100_LED_CURR_7_6MA);
        Serial.println("MAX30100 initialized.");
    }
    else
    {
        Serial.println("MAX30100 not detected; gesture control continues.");
    }

    Serial.println("Setup complete.");
}


// ------------ MAIN LOOP ----------------
void loop()
{
    if (pulseReady)
        pox.update();

    Serial.println("\nCollecting gesture...");

    if (!collectGesture())
    {
        delay(200);
        return;
    }

    signal_t signal;
    signal.total_length = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
    signal.get_data = getSignalData;

    ei_impulse_result_t result = {0};

    EI_IMPULSE_ERROR error = run_classifier(&signal, &result, false);

    if (error != EI_IMPULSE_OK)
    {
        Serial.print("Inference error: ");
        Serial.println(error);
        delay(200);
        return;
    }

    float highest = 0.0f;
    int best = 0;

    Serial.println("--- Gesture Predictions ---");

    for (int i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++)
    {
        Serial.print(result.classification[i].label);
        Serial.print(": ");
        Serial.println(result.classification[i].value, 3);

        if (result.classification[i].value > highest)
        {
            highest = result.classification[i].value;
            best = i;
        }
    }

    const char *gesture = result.classification[best].label;

    Serial.print("Detected: ");
    Serial.println(gesture);

    Serial.print("Confidence: ");
    Serial.println(highest, 3);

    if (highest < CONFIDENCE_THRESHOLD)
    {
        Serial.println("Low confidence; fan state unchanged.");
    }
    else if (strcmp(gesture, "fan_on") == 0)
    {
        setFan(true);
    }
    else if (strcmp(gesture, "fan_off") == 0)
    {
        setFan(false);
    }
    else if (strcmp(gesture, "idle") == 0)
    {
        Serial.println("IDLE: fan state unchanged.");
    }
    else
    {
        Serial.println("Unknown class; fan state unchanged.");
    }

    // Print vitals when available
    if (pulseReady && millis() - lastVitalsPrint >= 1000)
    {
        lastVitalsPrint = millis();

        Serial.print("Heart rate: ");
        Serial.print(pox.getHeartRate());
        Serial.print(" BPM | SpO2: ");
        Serial.print(pox.getSpO2());
        Serial.println("%");
    }

    delay(100);
}
