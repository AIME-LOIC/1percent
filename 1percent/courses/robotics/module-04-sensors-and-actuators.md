# Module 4: Sensors and Actuators

**Status:** FREE — Open access for all learners
**Duration:** 1 week
**Lessons:** 3

---

## Lesson 4.1: Ultrasonic Distance Sensor

**Duration:** 25 minutes | **Type:** Reading

---

The HC-SR04 ultrasonic sensor lets your robot "see" distance. It sends out a sound pulse, measures how long it takes to bounce back, and calculates the distance.

### How It Works

1. The sensor sends a 40kHz sound pulse (inaudible to humans)
2. The pulse hits an object and bounces back
3. The sensor measures the round-trip time
4. Distance = (time × speed of sound) ÷ 2

Speed of sound ≈ 343 meters/second = 0.0343 cm/microsecond

### Wiring

```
  HC-SR04        Arduino
  ───────        ───────
  VCC      →     5V
  Trig     →     Pin 7
  Echo     →     Pin 8
  GND      →     GND
```

### Arduino Code

```cpp
const int trigPin = 7;
const int echoPin = 8;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  // Send trigger pulse
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // Read echo
  long duration = pulseIn(echoPin, HIGH);
  long distance = duration * 0.0343 / 2;

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  delay(500);
}
```

**Key function:** `pulseIn(echoPin, HIGH)` measures how long the echo pin stays HIGH — this is the round-trip time in microseconds.

### Practical Range

- Effective range: 2cm to 400cm
- Accuracy: ±1cm
- Not reliable for angles > 30° from the sensor face
- Does not work well on soft surfaces (fabric absorbs sound)

### No HC-SR04? Improvise

- **Infrared distance sensor (Sharp GP2Y0A21):** Works differently (infrared light), similar range
- **Bumper switch:** A microswitch on a lever arm. When the robot bumps something, the switch closes. Simple but less elegant.
- **Your eyes:** For initial testing, just look at the Serial Monitor and move your hand toward the sensor to see distance readings change.

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - HC-SR04 sends ultrasonic pulses and measures echo time
> - Distance = (time × 0.0343) ÷ 2 cm
> - Range: 2-400cm, accuracy ±1cm
> - `pulseIn()` measures pulse duration in microseconds
> - Does not work on soft/absorbent surfaces

---

## Lesson 4.2: Servo Motors — Precise Movement

**Duration:** 25 minutes | **Type:** Reading

---

Servo motors are the muscles of small robots. They rotate to a specific angle (0-180°) and hold position. You find them in RC cars, robotic arms, and pan-tilt camera mounts.

### How a Servo Works

A servo has three wires:
- **Red:** Power (5V-6V)
- **Brown/Black:** Ground (GND)
- **Orange/Yellow:** Signal (control from Arduino)

The Arduino sends a PWM pulse. The pulse width determines the angle:
- 1ms pulse = 0°
- 1.5ms pulse = 90° (center)
- 2ms pulse = 180°

### Wiring

```
  Servo         Arduino
  ─────         ───────
  Red (VCC)  →  5V (or external 6V for larger servos)
  Brown (GND) → GND
  Orange (Signal) → Pin 9
```

**Important:** Small servos (SG90 micro servo) can run from Arduino's 5V. Larger servos need an external power supply — they draw too much current and will reset the Arduino.

### Arduino Code: Sweep

```cpp
#include <Servo.h>

Servo myServo;

void setup() {
  myServo.attach(9);  // Attach servo to pin 9
}

void loop() {
  myServo.write(0);     // Move to 0 degrees
  delay(1000);
  myServo.write(90);    // Move to center
  delay(1000);
  myServo.write(180);   // Move to 180 degrees
  delay(1000);
}
```

**`#include <Servo.h>`** loads the Servo library (built into Arduino IDE).
**`myServo.attach(9)`** connects the servo to pin 9.
**`myServo.write(angle)`** moves to the specified angle.

### Controlling Servo with Potentiometer

```cpp
#include <Servo.h>

Servo myServo;

void setup() {
  myServo.attach(9);
}

void loop() {
  int val = analogRead(A0);        // Read pot (0-1023)
  int angle = map(val, 0, 1023, 0, 180);  // Convert to degrees
  myServo.write(angle);            // Move servo
  delay(15);                       // Small delay for stability
}
```

Turn the pot → servo follows. This is how RC car steering works.

### No Servo? Improvise

- **DC motor with gear reduction + position feedback:** More complex but uses cheaper motors
- **Manual servo:** Use the servo horn as a simple switch actuator
- **Paper and straw:** Build a manual lever mechanism to understand the concept before using real servos

### Micro Servo (SG90) Specs

| Parameter | Value |
|---|---|
| Voltage | 4.8-6V |
| Torque | 1.8 kg·cm |
| Speed | 0.1s/60° |
| Weight | 9g |
| Cost | RWF 1,500-3,000 |

The SG90 is the cheapest and most common hobby servo. Perfect for small robots.

---

### Circuit Diagram: Servo + Potentiometer

```
  5V ──[Potentiometer]──┬── Arduino A0
                        │
                       [10kΩ]
                        │
                       GND

  Arduino Pin 9 ──── Servo Signal (Orange)
  Arduino 5V ─────── Servo VCC (Red)
  Arduino GND ────── Servo GND (Brown)
```

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Servo motors rotate to a specific angle and hold position
> - Three wires: VCC, GND, Signal (PWM from Arduino)
> - Use `Servo.h` library: `attach()`, `write(angle)`
> - Small servos (SG90) run from Arduino 5V; large ones need external power
> - Potentiometer + servo = manual control (basis of RC steering)

---

## Lesson 4.3: DC Motors and Motor Drivers

**Duration:** 20 minutes | **Type:** Reading

---

DC motors spin continuously. They are the wheels of your robot. But Arduino pins cannot drive motors directly — you need a motor driver.

### Why a Motor Driver?

An Arduino pin supplies ~20mA max. A small DC motor needs 100-500mA. Connecting a motor directly to an Arduino pin will:
1. Not spin the motor (not enough current)
2. Possibly damage the Arduino pin

A motor driver is a chip that takes a small signal from Arduino and switches a larger current from the battery to the motor.

### The L298N Motor Driver

The most common hobby motor driver. It can control 2 DC motors (or 1 stepper motor).

**Pins:**
```
  L298N
  ─────
  IN1, IN2  →  Arduino pins (control motor A direction)
  IN3, IN4  →  Arduino pins (control motor B direction)
  ENA       →  Arduino PWM pin (control motor A speed)
  ENB       →  Arduino PWM pin (control motor B speed)
  OUT1, OUT2 →  Motor A wires
  OUT3, OUT4 →  Motor B wires
  12V       →  Battery positive
  GND       →  Battery negative + Arduino GND
  5V        →  5V output (can power Arduino if jumper is in)
```

### Motor Control Truth Table

| IN1 | IN2 | Motor A |
|---|---|---|
| HIGH | LOW | Forward |
| LOW | HIGH | Reverse |
| LOW | LOW | Stop |
| HIGH | HIGH | Stop (brake) |

### Arduino Code: Motor Forward

```cpp
const int in1 = 5;
const int in2 = 6;

void setup() {
  pinMode(in1, OUTPUT);
  pinMode(in2, OUTPUT);
}

void loop() {
  // Forward
  digitalWrite(in1, HIGH);
  digitalWrite(in2, LOW);
  delay(2000);

  // Stop
  digitalWrite(in1, LOW);
  digitalWrite(in2, LOW);
  delay(1000);

  // Reverse
  digitalWrite(in1, LOW);
  digitalWrite(in2, HIGH);
  delay(2000);

  // Stop
  digitalWrite(in1, LOW);
  digitalWrite(in2, LOW);
  delay(1000);
}
```

### Speed Control with PWM

```cpp
analogWrite(ENA, 128);  // 50% speed (0 = stop, 255 = full)
```

`analogWrite()` on the ENA pin controls speed. 128 = half speed, 255 = full speed.

### No L298N? Improvise

- **Two transistors (TIP120 or similar):** Build an H-bridge from discrete components
- **Relay module:** On/off only, no speed control, but works for basic movement
- **Direct drive (risky):** For very small motors (pager motors), connect directly to Arduino with a flyback diode. Monitor temperature.

### No Motor Driver Board? Build One

An H-bridge from 4 transistors:

```
        5V
        │
    ┌───┤───┐
    T1      T2
    │       │
    ├─MOT───┤
    │       │
    T3      T4
    └───┤───┘
        │
       GND
```

T1+T4 on = forward. T2+T3 on = reverse. Never turn on T1+T3 or T2+T4 at the same time (short circuit).

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - DC motors need more current than Arduino pins supply — use a motor driver
> - L298N controls 2 motors: direction (IN1/IN2) and speed (ENA via PWM)
> - Motor truth table: IN1 HIGH + IN2 LOW = forward
> - `analogWrite(ENA, speed)` controls motor speed (0-255)
> - Improvise with transistors, relays, or discrete H-bridge

---

## Module 4 Quiz

**4 Questions — Passing score: 3/4**

1. **How does an HC-SR04 calculate distance?**
   - A) By measuring light intensity
   - B) By sending a sound pulse and measuring echo time
   - C) By counting rotations
   - D) By measuring temperature

2. **What angle does a 1.5ms PWM pulse set a servo to?**
   - A) 0°
   - B) 45°
   - C) 90°
   - D) 180°

3. **Why can you not connect a DC motor directly to an Arduino pin?**
   - A) The voltage is too high
   - B) The motor draws more current than the pin can supply
   - C) Motors need AC power
   - D) Arduino pins only work with sensors

4. **What does `analogWrite(ENA, 128)` do?**
   - A) Stops the motor
   - B) Runs the motor at 50% speed
   - C) Runs the motor at full speed
   - D) Reverses the motor

**Answers:** 1-B, 2-C, 3-B, 4-B

---

## Certificate Checkpoint: Module 4 Complete

**You've learned:**
- How ultrasonic sensors measure distance
- How servo motors provide precise angular movement
- How DC motors work with motor drivers
- How to control motor speed and direction

**Certificate:** Complete the quiz with 3/4 correct answers to unlock your Module 4 certificate and proceed to Module 5.
