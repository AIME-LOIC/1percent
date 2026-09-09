# Module 6: Building an Obstacle Avoider Robot

**Status:** FREE — Open access for all learners
**Duration:** 1 week
**Lessons:** 3

---

## Lesson 6.1: How Obstacle Avoidance Works

**Duration:** 20 minutes | **Type:** Reading

---

An obstacle avoider robot navigates around objects autonomously. It is one step closer to a "real" robot — it makes decisions based on what it senses.

### The Core Concept

1. Robot drives forward
2. Ultrasonic sensor detects an object ahead
3. Robot stops
4. Robot checks left and right by turning the sensor (or the whole robot)
5. Robot chooses the clearer path
6. Robot turns and continues

This is the simplest form of autonomous navigation.

### Sensor Options

**Ultrasonic (HC-SR04):** Most common. Measures distance 2-400cm. Needs two pins (trigger, echo). Good for this project.

**Infrared proximity sensor (Sharp GP2Y0A21):** Measures 10-80cm. One analog output. Faster response than ultrasonic but shorter range.

**Bump sensor (microswitch):** Physical contact switch. Robot bumps → switch closes → robot reacts. Simple but requires physical contact.

**Combined approach:** Ultrasonic for early detection + bump sensor as backup. This is what most commercial robots do.

### Why Not Just One Sensor?

One sensor only sees forward. The robot needs to "look" left and right to decide where to go. Options:
- **Mount sensor on a servo:** Rotate the sensor left/right to scan before turning
- **Turn the whole robot:** Simpler but less efficient
- **Multiple sensors:** One on each side — more expensive but faster

### The Decision Algorithm

```
IF distance < 20cm:
    STOP
    SCAN left and right
    IF left is clearer:
        TURN left 90°
    ELSE IF right is clearer:
        TURN right 90°
    ELSE:
        TURN 180° (dead end)
ELSE:
    DRIVE forward
```

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Obstacle avoidance = sense → decide → act loop
> - Ultrasonic sensor measures distance to objects
> - Robot needs to scan left and right before choosing a direction
> - Simple algorithm: stop when close, scan, turn toward clearer path
> - Combine ultrasonic + bump sensor for robustness

---

## Lesson 6.2: Building the Obstacle Avoider

**Duration:** 30 minutes | **Type:** Reading

---

You can reuse the line follower chassis and add an ultrasonic sensor on a servo.

### Additional Parts

| Component | Quantity | Cost | Substitute |
|---|---|---|---|
| HC-SR04 ultrasonic sensor | 1 | RWF 1,000-2,000 | IR proximity sensor |
| SG90 micro servo | 1 | RWF 1,500-3,000 | Manual pivot |
| Jumper wires | 5+ | RWF 500 | — |

**Total additional cost: RWF 3,000-5,000**

### Mounting the Sensor

Mount the HC-SR04 on the servo horn so the sensor can look left and right.

```
      ┌─────────┐
      │ HC-SR04 │  ← Ultrasonic sensor
      └────┬────┘
           │ mounted on
      ┌────┴────┐
      │ Servo   │  ← Rotates left/right
      │  Horn   │
      └────┬────┘
           │
      ┌────┴────┐
      │  Robot  │
      │  Body   │
      └─────────┘
```

Use hot glue, zip ties, or a custom bracket to attach the sensor to the servo horn.

### Wiring

**Servo:** Signal → Arduino Pin 11

**Ultrasonic:**
- VCC → 5V
- GND → GND
- Trig → Arduino Pin 7
- Echo → Arduino Pin 8

(Same as Module 4, plus servo on pin 11)

### No Servo for Sensor? Improvise

- **Turn the whole robot:** Instead of rotating the sensor, just turn the robot left, measure, turn right, measure, then decide
- **Two sensors mounted at angles:** One angled 30° left, one 30° right. No rotation needed
- **Manual scan:** For testing, hold the sensor by hand and point it in different directions while watching Serial Monitor

### Power Considerations

Running motors + servo + sensors draws significant current. If your Arduino resets when motors start:
1. Use a separate battery for motors (through L298N)
2. Power Arduino from the L298N 5V output
3. Add a 100µF capacitor across the motor power rails

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Mount HC-SR04 on a servo to scan left/right
> - Additional cost: RWF 3,000-5,000
> - Hot glue or zip ties secure sensor to servo horn
> - If Arduino resets when motors start, separate motor and logic power
> - Improvise: turn whole robot, use angled sensors, or manual scan

---

## Lesson 6.3: Obstacle Avoidance Code

**Duration:** 25 minutes | **Type:** Reading

---

Here is the complete code for an obstacle-avoiding robot with sensor on a servo.

### Complete Code

```cpp
#include <Servo.h>

Servo scanServo;

// Motor pins
const int in1 = 7, in2 = 8;
const int in3 = 9, in4 = 10;
const int enA = 5, enB = 6;

// Ultrasonic pins
const int trigPin = A0;
const int echoPin = A1;

// Servo pin
const int servoPin = 11;

long getDistance() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  return duration * 0.0343 / 2;
}

void forward(int speed) {
  digitalWrite(in1, HIGH); digitalWrite(in2, LOW);
  digitalWrite(in3, HIGH); digitalWrite(in4, LOW);
  analogWrite(enA, speed);
  analogWrite(enB, speed);
}

void backward(int speed) {
  digitalWrite(in1, LOW); digitalWrite(in2, HIGH);
  digitalWrite(in3, LOW); digitalWrite(in4, HIGH);
  analogWrite(enA, speed);
  analogWrite(enB, speed);
}

void turnLeft(int speed) {
  digitalWrite(in1, LOW); digitalWrite(in2, LOW);
  digitalWrite(in3, HIGH); digitalWrite(in4, LOW);
  analogWrite(enA, 0);
  analogWrite(enB, speed);
}

void turnRight(int speed) {
  digitalWrite(in1, HIGH); digitalWrite(in2, LOW);
  digitalWrite(in3, LOW); digitalWrite(in4, LOW);
  analogWrite(enA, speed);
  analogWrite(enB, 0);
}

void stopMotors() {
  digitalWrite(in1, LOW); digitalWrite(in2, LOW);
  digitalWrite(in3, LOW); digitalWrite(in4, LOW);
}

long scan(int angle) {
  scanServo.write(angle);
  delay(500);
  return getDistance();
}

void setup() {
  Serial.begin(9600);
  pinMode(in1, OUTPUT); pinMode(in2, OUTPUT);
  pinMode(in3, OUTPUT); pinMode(in4, OUTPUT);
  pinMode(enA, OUTPUT); pinMode(enB, OUTPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  scanServo.attach(servoPin);
  scanServo.write(90);  // Center
  delay(500);
}

void loop() {
  long distance = getDistance();

  if (distance < 20) {
    // Object detected — stop and scan
    stopMotors();
    delay(200);

    long leftDist = scan(170);   // Look left
    long rightDist = scan(10);   // Look right
    scanServo.write(90);         // Center

    if (leftDist > rightDist) {
      // Left is clearer — turn left
      turnLeft(150);
      delay(500);
    } else {
      // Right is clearer — turn right
      turnRight(150);
      delay(500);
    }
  } else {
    // Path clear — go forward
    forward(150);
  }
}
```

### How It Works

1. `getDistance()` sends an ultrasonic pulse and returns distance in cm
2. `scan(angle)` moves the servo and reads distance at that angle
3. In `loop()`: if distance < 20cm, stop, scan left and right, turn toward the clearer path
4. If path is clear, drive forward

### Tuning

- **`distance < 20`:** Change this threshold. Larger = more cautious, smaller = more aggressive
- **`delay(500)` in scan:** Longer = more accurate but slower
- **Motor speeds (150):** Adjust for your motors. Some need more, some less
- **Scan angles (10, 170):** Adjust based on servo range

### Testing

1. Start with a large open space
2. Place one obstacle (box, book) in the path
3. Watch the robot approach, stop, scan, and turn
4. Add more obstacles to create a maze
5. Tune the distance threshold and speeds

### Simple Version Without Servo

If you do not have a servo, use this simpler approach:

```cpp
void loop() {
  long distance = getDistance();

  if (distance < 20) {
    stopMotors();
    delay(200);
    backward(120);
    delay(400);
    turnRight(150);
    delay(600);
  } else {
    forward(150);
  }
}
```

Robot detects obstacle → backs up → turns right → continues. No scanning needed. Less elegant but functional.

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - `getDistance()` function measures ultrasonic distance
> - `scan(angle)` rotates sensor and reads distance at that angle
> - Stop when distance < 20cm, scan left/right, turn toward clearer path
> - Simple version: back up and turn right when obstacle detected
> - Tune distance threshold, scan delays, and motor speeds for your robot
> - Test in open space first, then add obstacles

---

## Module 6 Quiz

**4 Questions — Passing score: 3/4**

1. **Why mount the ultrasonic sensor on a servo?**
   - A) To make the robot look cooler
   - B) To scan left and right before deciding which way to turn
   - C) To increase the sensor's range
   - D) To reduce power consumption

2. **What should the robot do when it detects an object less than 20cm away?**
   - A) Speed up
   - B) Stop, scan left and right, then turn toward the clearer path
   - C) Continue forward
   - D) Shut down

3. **In the simple version without a servo, how does the robot avoid obstacles?**
   - A) It stops permanently
   - B) It backs up and turns right
   - C) It jumps over the obstacle
   - D) It calls for help

4. **Why might the Arduino reset when motors start?**
   - A) Software bug
   - B) Motors draw too much current, causing voltage drop
   - C) The battery is too strong
   - D) The code is too long

**Answers:** 1-B, 2-B, 3-B, 4-B

---

## Certificate Checkpoint: Module 6 Complete

**You've learned:**
- How obstacle avoidance works (sense → decide → act)
- How to build an obstacle-avoiding robot with ultrasonic sensor on a servo
- How to write the avoidance code
- How to tune and test the robot

**Certificate:** Complete the quiz with 3/4 correct answers to unlock your Module 6 certificate and proceed to Module 7.
