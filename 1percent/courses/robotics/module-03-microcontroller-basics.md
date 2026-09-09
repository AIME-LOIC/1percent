# Module 3: Microcontroller Basics — Arduino

**Status:** FREE — Open access for all learners
**Duration:** 1 week
**Lessons:** 3

---

## Lesson 3.1: What Is a Microcontroller?

**Duration:** 20 minutes | **Type:** Reading

---

A microcontroller is a tiny computer on a single chip. It has a processor, memory, and input/output pins. You write a program (called a "sketch"), upload it to the chip, and it runs your instructions forever — or until you upload something new.

### Why Arduino?

**Arduino Uno** is the most popular microcontroller for learning. It costs RWF 5,000-15,000 (or less for clones). It has:

- 14 digital pins (on/off control)
- 6 analog pins (read varying voltages like light, temperature)
- 5V operating voltage
- USB connection for programming
- Built-in power regulation

**Alternatives if Arduino is unavailable:**
- **ESP8266 (NodeMCU):** Cheaper (RWF 2,000-5,000), has WiFi, 3.3V logic
- **Arduino Nano:** Same as Uno but smaller and cheaper
- **ESP32:** More powerful, WiFi + Bluetooth, RWF 3,000-8,000

### The Arduino Ecosystem

**Software:** Arduino IDE (free) — write code on your computer, upload via USB
**Language:** C/C++ simplified (very beginner-friendly)
**Community:** Millions of tutorials, forums, and example projects

### Installing the Arduino IDE

1. Go to **arduino.cc/en/software**
2. Download for your operating system (Windows, Mac, Linux)
3. Install and open
4. Connect Arduino Uno via USB
5. Go to **Tools → Board → Arduino Uno**
6. Go to **Tools → Port** — select the port that appeared
7. You are ready to program

### The Arduino Language Basics

**Setup function:** Runs once when the board powers on.
```cpp
void setup() {
  // Configure pins here
}
```

**Loop function:** Runs forever, over and over.
```cpp
void loop() {
  // Your main code here
}
```

That is the structure of every Arduino program.

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - A microcontroller is a programmable chip with I/O pins
> - Arduino Uno is the best beginner board (5V, 14 digital + 6 analog pins)
> - Alternatives: ESP8266 (cheaper, WiFi), Nano (smaller), ESP32 (more powerful)
> - Arduino IDE is free — write code, upload via USB
> - Every sketch has `setup()` (runs once) and `loop()` (runs forever)

---

## Lesson 3.2: Your First Arduino Sketch — Blink

**Duration:** 25 minutes | **Type:** Reading

---

The Blink example is the "Hello World" of Arduino. It blinks the built-in LED on and off.

### The Code

```cpp
void setup() {
  pinMode(13, OUTPUT);  // Set pin 13 as output
}

void loop() {
  digitalWrite(13, HIGH);  // Turn LED ON
  delay(1000);              // Wait 1 second
  digitalWrite(13, LOW);   // Turn LED OFF
  delay(1000);              // Wait 1 second
}
```

### Line by Line

**`pinMode(13, OUTPUT)`** — Tells Arduino that pin 13 will send power out (not read input).

**`digitalWrite(13, HIGH)`** — Sends 5V to pin 13 (turns things ON).

**`digitalWrite(13, LOW)`** — Sends 0V to pin 13 (turns things OFF).

**`delay(1000)`** — Pauses for 1000 milliseconds (1 second).

### Upload and Run

1. Open Arduino IDE
2. Paste the code above
3. Click the **Upload** button (→ arrow)
4. Wait for "Done uploading"
5. The small LED near pin 13 should blink: on for 1 second, off for 1 second

**Congratulations.** You just programmed a microcontroller.

### Modifying the Blink

**Faster blink:**
```cpp
delay(200);  // 200ms = 5 blinks per second
```

**Uneven blink (on longer than off):**
```cpp
digitalWrite(13, HIGH);
delay(3000);   // ON for 3 seconds
digitalWrite(13, LOW);
delay(500);    // OFF for 0.5 seconds
```

**Morse code SOS (... --- ...):**
```cpp
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  // S: three short
  for(int i = 0; i < 3; i++) {
    digitalWrite(13, HIGH); delay(200);
    digitalWrite(13, LOW);  delay(200);
  }
  delay(400);  // gap between letters
  // O: three long
  for(int i = 0; i < 3; i++) {
    digitalWrite(13, HIGH); delay(600);
    digitalWrite(13, LOW);  delay(200);
  }
  delay(400);
  // S: three short
  for(int i = 0; i < 3; i++) {
    digitalWrite(13, HIGH); delay(200);
    digitalWrite(13, LOW);  delay(200);
  }
  delay(2000);  // pause before repeating
}
```

### External LED on Arduino

Pin 13 has a built-in LED, but for robotics you will use external LEDs:

1. Connect Arduino 5V → Resistor (220Ω) → LED (+) → LED (-) → Arduino GND
2. Modify the code to use pin 12 instead of 13:

```cpp
void setup() {
  pinMode(12, OUTPUT);
}
void loop() {
  digitalWrite(12, HIGH); delay(500);
  digitalWrite(12, LOW);  delay(500);
}
```

### No USB Cable? Improvise

- **Old phone charger cable:** Cut it, find the USB data lines (green and white wires), connect to Arduino USB pins
- **9V battery with barrel jack adapter:** Powers Arduino without USB (but you need USB for programming first)
- **Borrow a laptop** from a friend, school, or library for programming

---

### Circuit Diagram: External LED on Arduino

```
  Arduino Pin 12 ──[220Ω]──>|── Arduino GND
                            LED
```

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - `pinMode()` configures a pin as INPUT or OUTPUT
> - `digitalWrite(pin, HIGH/LOW)` turns things on/off
> - `delay(ms)` pauses in milliseconds
> - Every Arduino sketch needs `setup()` and `loop()`
> - External LEDs need a resistor, connected from a digital pin to GND

---

## Lesson 3.3: Reading Sensors — Analog Input

**Duration:** 25 minutes | **Type:** Reading

---

So far you have only sent signals OUT (LEDs, buzzers). Now let us read signals IN from the real world.

### Analog vs Digital Input

**Digital input:** Reads only HIGH (1) or LOW (0). Like a light switch — on or off.

**Analog input:** Reads a range of values (0-1023 on Arduino). Like a dimmer switch — anywhere between fully off and fully on.

### The Analog Pins

Arduino Uno has 6 analog pins: A0 through A5. They read voltages from 0V to 5V and convert them to numbers 0-1023.

### Reading a Potentiometer

A potentiometer (pot) is a variable resistor — a knob that changes resistance as you turn it.

**Circuit:**
```
  5V ──── Potentiometer middle pin ──── Arduino A0
  GND ──── Potentiometer side pin ──── Arduino A0 (other side)
```

Actually, connect:
- Potentiometer left pin → 5V
- Potentiometer middle pin (wiper) → Arduino A0
- Potentiometer right pin → GND

**Code:**
```cpp
void setup() {
  Serial.begin(9600);  // Open serial monitor
}

void loop() {
  int value = analogRead(A0);  // Read potentiometer (0-1023)
  Serial.println(value);       // Print to computer
  delay(100);
}
```

**What happens:** Turn the knob. Numbers change from 0 (fully left) to 1023 (fully right). Open Serial Monitor (Tools → Serial Monitor) to see the values.

### Reading a Photoresistor (Light Sensor)

A photoresistor changes resistance based on light. Bright light = low resistance. Dark = high resistance.

**Circuit:**
```
  5V ──── Photoresistor ───┬── Arduino A0
                           │
                          [10kΩ]
                           │
                          GND
```

This is a **voltage divider** — the photoresistor and fixed resistor create a voltage that changes with light.

**Code:** Same as potentiometer. Bright light gives low values, dark gives high values (or vice versa, depending on wiring).

### Using Sensor Values to Control Outputs

Combine reading and writing:

```cpp
int ledPin = 9;

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int light = analogRead(A0);
  int brightness = map(light, 0, 1023, 0, 255);
  analogWrite(ledPin, brightness);
  delay(100);
}
```

**`map()`** converts one range to another: sensor 0-1023 → LED brightness 0-255.

**`analogWrite()`** outputs a PWM signal — rapid on/off that simulates dimming.

**What happens:** LED brightness follows the light level. Cover the sensor → LED dims. Shine a flashlight → LED brightens.

### No Photoresistor? Improvise

- **Two exposed wires in water:** Water conducts (poorly). More water = more conduction = different reading.
- **LDR from a broken street light:** Desolder the light sensor.
- **Your phone screen:** Hold it against an LED — phone brightness affects the reading.

---

### Circuit Diagram: Light-Controlled LED

```
  5V ──[Photoresistor]──┬── Arduino A0
                        │
                       [10kΩ]
                        │
                       GND

  Arduino Pin 9 ──[220Ω]──>|── GND
                            LED
```

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - `analogRead(pin)` reads 0-1023 from analog pins (A0-A5)
> - Potentiometer: variable resistor, gives a position value
> - Photoresistor + fixed resistor = voltage divider for light sensing
> - `map()` converts between ranges (sensor 0-1023 → LED 0-255)
> - `analogWrite()` controls LED brightness via PWM
> - Improvise sensors with water, wires, and phone screens

---

## Module 3 Quiz

**4 Questions — Passing score: 3/4**

1. **What does `setup()` do in an Arduino sketch?**
   - A) Runs forever
   - B) Runs once when the board powers on
   - C) Compiles the code
   - D) Uploads the sketch

2. **What value does `analogRead(A0)` return?**
   - A) 0 or 1
   - B) 0 to 1023
   - C) 0 to 255
   - D) 0 to 5

3. **Why does a photoresistor need a fixed resistor to form a voltage divider?**
   - A) To power the sensor
   - B) To convert resistance change into a voltage change the Arduino can read
   - C) To protect the Arduino from too much current
   - D) It does not — connect it directly

4. **What does `map(value, 0, 1023, 0, 255)` do?**
   - A) Multiplies value by 255
   - B) Converts a 0-1023 range to a 0-255 range
   - C) Limits value to 255
   - D) Subtracts 1023

**Answers:** 1-B, 2-B, 3-B, 4-B

---

## Certificate Checkpoint: Module 3 Complete

**You've learned:**
- What a microcontroller is and why Arduino is great for beginners
- How to write and upload a Blink sketch
- How to read analog sensors (potentiometer, photoresistor)
- How to map sensor values to control outputs

**Certificate:** Complete the quiz with 3/4 correct answers to unlock your Module 3 certificate and proceed to Module 4.
