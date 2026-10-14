
#include <Arduino.h>
#include <ESP_I2S.h>
#include <Wire.h>
#include <MAX30100_PulseOximeter.h>
#include <voice_train_inferencing.h>

// =================================================
// INMP441 MICROPHONE
// =================================================

#define I2S_SCK 33
#define I2S_WS  25
#define I2S_SD  32

I2SClass I2S;

// =================================================
// RELAY
// =================================================

#define RELAY_PIN 13

// Active-LOW relay
#define FAN_ON  LOW
#define FAN_OFF HIGH

bool fanIsOn = false;

// =================================================
// MAX30100
// =================================================

#define PULSE_SDA 18
#define PULSE_SCL 19

PulseOximeter pox;
bool pulseReady = false;

unsigned long lastVitalsPrint = 0;

// =================================================
// EDGE IMPULSE VOICE MODEL
// =================================================

#define AUDIO_SAMPLES EI_CLASSIFIER_RAW_SAMPLE_COUNT
#define CONFIDENCE_THRESHOLD 0.65f

static int16_t audioBuffer[AUDIO_SAMPLES];
static int32_t rawChunk[256];


// =================================================
// AUDIO DATA CALLBACK
// =================================================

static int microphone_get_data(
    size_t offset,
    size_t length,
    float *out_ptr)
{
    numpy::int16_to_float(
        &audioBuffer[offset],
        out_ptr,
        length
    );

    return 0;
}


// =================================================
// RECORD AUDIO
// =================================================

bool recordAudio()
{
    size_t captured = 0;

    while (captured < AUDIO_SAMPLES)
    {
        size_t remaining = AUDIO_SAMPLES - captured;

        size_t chunkSamples =
            remaining < 256 ? remaining : 256;

        size_t bytesRead = I2S.readBytes(
            (char *)rawChunk,
            chunkSamples * sizeof(int32_t)
        );

        if (bytesRead == 0 ||
            bytesRead % sizeof(int32_t) != 0)
        {
            Serial.println("Microphone read error!");
            return false;
        }

        size_t samplesRead =
            bytesRead / sizeof(int32_t);

        for (size_t i = 0;
             i < samplesRead && captured < AUDIO_SAMPLES;
             i++)
        {
            audioBuffer[captured++] =
                (int16_t)(rawChunk[i] >> 16);
        }

        // Keep the pulse sensor updated during recording
        if (pulseReady)
        {
            pox.update();
        }
    }

    return true;
}


// =================================================
// FAN CONTROL
// =================================================

void setFan(bool turnOn)
{
    fanIsOn = turnOn;

    digitalWrite(
        RELAY_PIN,
        turnOn ? FAN_ON : FAN_OFF
    );

    if (turnOn)
        Serial.println("ACTION: FAN ON");
    else
        Serial.println("ACTION: FAN OFF");
}


// =================================================
// MAX30100 OUTPUT
// =================================================

void printVitals()
{
    if (!pulseReady)
        return;

    if (millis() - lastVitalsPrint >= 1000)
    {
        lastVitalsPrint = millis();

        Serial.print("Heart Rate: ");
        Serial.print(pox.getHeartRate());
        Serial.print(" BPM | SpO2: ");
        Serial.print(pox.getSpO2());
        Serial.println("%");
    }
}


// =================================================
// SETUP
// =================================================

void setup()
{
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("==================================");
    Serial.println(" TinyGest Voice Control");
    Serial.println(" ESP32 + INMP441 + MAX30100");
    Serial.println("==================================");

    // Relay initialization
    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, FAN_OFF);

    Serial.println("Fan initialized OFF.");

    // MAX30100 on separate I2C bus
    Wire.begin(PULSE_SDA, PULSE_SCL, 100000);

    if (pox.begin())
    {
        pulseReady = true;

        pox.setIRLedCurrent(
            MAX30100_LED_CURR_7_6MA
        );

        Serial.println("MAX30100 initialized.");
    }
    else
    {
        Serial.println(
            "MAX30100 initialization failed."
        );

        Serial.println(
            "Voice control will continue."
        );
    }

    // INMP441 initialization
    I2S.setPins(
        I2S_SCK,
        I2S_WS,
        -1,
        I2S_SD
    );

    if (!I2S.begin(
            I2S_MODE_STD,
            EI_CLASSIFIER_FREQUENCY,
            I2S_DATA_BIT_WIDTH_32BIT,
            I2S_SLOT_MODE_MONO,
            I2S_STD_SLOT_LEFT))
    {
        Serial.println(
            "ERROR: INMP441 initialization failed!"
        );

        while (true)
        {
            delay(1000);
        }
    }

    Serial.println("INMP441 initialized.");

    Serial.print("Audio sample rate: ");
    Serial.println(EI_CLASSIFIER_FREQUENCY);

    Serial.print("Audio sample count: ");
    Serial.println(AUDIO_SAMPLES);

    Serial.println("Voice model ready.");
}


// =================================================
// MAIN LOOP
// =================================================

void loop()
{
    if (pulseReady)
        pox.update();

    Serial.println();
    Serial.println("----------------------------------");
    Serial.println("Recording audio...");
    Serial.println("Speak your trained command.");

    if (!recordAudio())
    {
        delay(300);
        return;
    }

    Serial.println("Recording complete.");
    Serial.println("Running voice recognition...");

    signal_t signal;

    signal.total_length = AUDIO_SAMPLES;
    signal.get_data = microphone_get_data;

    ei_impulse_result_t result = {0};

    EI_IMPULSE_ERROR error =
        run_classifier(&signal, &result, false);

    if (error != EI_IMPULSE_OK)
    {
        Serial.print("Inference error: ");
        Serial.println(error);

        delay(300);
        return;
    }

    // Find the class with the highest confidence
    float highest = 0.0f;
    int best = 0;

    Serial.println();
    Serial.println("===== VOICE PREDICTIONS =====");

    for (int i = 0;
         i < EI_CLASSIFIER_LABEL_COUNT;
         i++)
    {
        Serial.print(
            result.classification[i].label
        );

        Serial.print(": ");

        Serial.println(
            result.classification[i].value,
            4
        );

        if (result.classification[i].value > highest)
        {
            highest = result.classification[i].value;
            best = i;
        }
    }

    const char *command =
        result.classification[best].label;

    Serial.print("Detected command: ");
    Serial.println(command);

    Serial.print("Confidence: ");
    Serial.println(highest, 4);

    // Reject uncertain predictions
    if (highest < CONFIDENCE_THRESHOLD)
    {
        Serial.println(
            "REJECTED: Confidence too low."
        );

        Serial.println("Fan state unchanged.");
    }
    else if (strcmp(command, "fan_on") == 0)
    {
        setFan(true);
    }
    else if (strcmp(command, "stop") == 0)
    {
        setFan(false);
    }
    else if (strcmp(command, "noise") == 0)
    {
        Serial.println(
            "Noise detected. Fan state unchanged."
        );
    }
    else if (strcmp(command, "unknown") == 0)
    {
        Serial.println(
            "Unknown command. Fan state unchanged."
        );
    }
    else
    {
        Serial.println(
            "Unrecognized class. Fan state unchanged."
        );
    }

    Serial.print("Current fan state: ");
    Serial.println(fanIsOn ? "ON" : "OFF");

    printVitals();

    delay(100);
}
