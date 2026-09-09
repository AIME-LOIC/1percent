# Module 5: Building a Line Follower Robot

**Status:** FREE — Open access for all learners
**Duration:** 1 week
**Lessons:** 3

---

## Lesson 5.1: How Line Following Works

**Duration:** 20 minutes | **Type:** Reading

---

A line follower is a robot that follows a line on the ground. It is the classic first robot project — simple enough to build, complex enough to teach real robotics concepts.

### The Basic Idea

A line (usually black tape on white floor, or white tape on dark floor) has sensors underneath the robot. The sensors detect the line. If the robot drifts left, sensors detect the line is on the right, and the robot corrects to the right. This feedback loop keeps the robot on the line.

### Types of Line Sensors

**Infrared (IR) reflectance sensors** are the most common. They have an IR LED and a phototransistor:

1. IR LED emits infrared light downward
2. Light hits the surface and reflects back
3. Phototransistor receives the reflected light
4. White surface = strong reflection = sensor reads LOW
5. Black line = weak reflection = sensor reads HIGH

**Common sensors:**
- **TCRT5000** module (RWF 500-1,500 each): Single sensor on a small PCB
- **QTR-8A or QTR-8R** (RWF 5,000-10,000): Array of 8 sensors on one board
- **DIY:** An IR LED + phototransistor + 10kΩ resistor on a breadboard

### Sensor Placement

For a simple line follower, you need 2-3 sensors:

```
  ┌─────────────┐
  │    Robot     │
  │   Body      │
  └──────┬──────┘
     [S1] [S2] [S3]
      │    │    │
      └────┴────┘
       Sensors face down
```

- **S1 (left):** Detects if robot drifts too far right
- **S2 (center):** Detects if robot is on the line
- **S3 (right):** Detects if robot drifts too far left

### The Control Logic

| Left Sensor | Center Sensor | Right Sensor | Action |
|---|---|---|---|
| OFF | ON | OFF | Go straight |
| OFF | OFF | ON | Turn left (line is to the right) |
| ON | OFF | OFF | Turn right (line is to the left) |
| ON | ON | ON | Stop (intersection or end) |
| OFF | OFF | OFF | Search — slow turn in last known direction |

### No IR Sensors? Improvise

- **Light-dependent resistor (LDR) + LED:** Shine a visible LED downward, LDR reads reflected light. Works but slower response.
- **Your phone camera:** For testing logic without hardware, point your phone camera at a black line on white paper and write code that responds to pixel brightness.
- **A single photodiode:** Slower than IR but functional for very basic line following.

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Line followers use IR sensors to detect reflected light from surfaces
> - Black = low reflection = HIGH sensor reading; White = high reflection = LOW
> - 2-3 sensors minimum for basic line following
> - Control logic: read sensors → decide direction → adjust motor speeds
> - Improvise with LDRs, LEDs, and phone cameras

---

## Lesson 5.2: Building the Hardware

**Duration:** 30 minutes | **Type:** Reading

---

Now let us build the actual robot.

### Parts List

| Component | Quantity | Approx Cost | Substitute |
|---|---|---|---|
| Arduino Uno | 1 | RWF 5,000-15,000 | Nano, ESP8266 |
| L298N motor driver | 1 | RWF 2,000-4,000 | Transistor H-bridge |
| DC gear motors (with wheels) | 2 | RWF 3,000-6,000 | Salvaged from old toys |
| Wheels | 2 | RWF 1,000-2,000 | Bottle caps with rubber bands |
| Caster wheel (or ball bearing) | 1 | RWF 500-1,000 | Smooth nail tip, or pen tip |
| TCRT5000 IR sensor modules | 3 | RWF 1,500-4,500 | DIY with IR LED + phototransistor |
| Battery holder (4×AA or 2S LiPo) | 1 | RWF 1,000-2,000 | 9V battery clip |
| Jumper wires | 10+ | RWF 500-1,000 | Solid-core wire stripped from cables |
| Breadboard or perfboard | 1 | RWF 1,000-2,000 |perfboard with solder |
| Chassis (base plate) | 1 | RWF 1,000-3,000 | Stiff cardboard, acrylic, or old CD case |
| Screws, zip ties, hot glue | — | RWF 500 | Tape, rubber bands |

**Total budget: RWF 15,000-45,000** depending on what you already have.

### Building Steps

**Step 1: Chassis**
Mount the two DC gear motors on opposite sides of the chassis. Ensure wheels are aligned. The caster wheel goes in front (or back) for balance.

```
  ┌──────────────────┐
  │                  │
  ○                  ○   ← Wheels (motors inside)
  │    [Arduino]     │
  │    [L298N]       │
  │                  │
  └────────●─────────┘
           ↑
      Caster wheel
```

**Step 2: Mount Electronics**
- Arduino on top of chassis (double-sided tape or screws)
- L298N motor driver next to Arduino
- Sensors mounted on the front, facing down, 5-10mm above the ground

**Step 3: Wire the Motors**
- Motor A wires → L298N OUT1, OUT2
- Motor B wires → L298N OUT3, OUT4
- Battery (+) → L298N 12V input
- Battery (-) → L298N GND
- L298N 5V output → Arduino 5V (if jumper is in) OR Arduino barrel jack

**Step 4: Wire the Sensors**
Each TCRT5000 sensor:
- VCC → 5V
- GND → GND
- OUT → Arduino digital pin (2, 3, 4 for left, center, right)

**Step 5: Wire Control**
- Arduino pins 5, 6 → L298N ENA, ENB (speed control)
- Arduino pins 7, 8 → L298N IN1, IN2 (motor A direction)
- Arduino pins 9, 10 → L298N IN3, IN4 (motor B direction)

### No Chassis? Improvise

- **Stiff cardboard:** Cut to shape, fold edges for rigidity
- **Old plastic container:** Cut to size, mount components inside
- **CD cases:** Stacked and glued, surprisingly rigid
- **Wooden cutting board:** Available at any market, easy to drill

### Testing Before Code

1. Power on the robot
2. Lift the wheels off the ground
3. Verify motors spin when you manually set IN pins HIGH in a test sketch
4. Verify sensors read different values over black tape vs white paper

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Total budget: RWF 15,000-45,000 depending on available parts
> - Motors mount on chassis sides, caster wheel for balance
> - L298N sits between Arduino and motors
> - Sensors mount on front, facing down, 5-10mm above ground
> - Test motors and sensors before writing line-following code
> - Improvise chassis from cardboard, plastic containers, or CD cases

---

## Lesson 5.3: Line Following Code

**Duration:** 25 minutes | **Type:** Reading

---

With hardware built and tested, here is the code that makes it follow the line.

### Basic Two-Sensor Code

```cpp
// Motor pins
const int in1 = 7, in2 = 8;   // Motor A
const int in3 = 9, in4 = 10;  // Motor B
const int enA = 5, enB = 6;   // Speed

// Sensor pins
const int leftSensor = 2;
const int rightSensor = 3;

void setup() {
  pinMode(in1, OUTPUT); pinMode(in2, OUTPUT);
  pinMode(in3, OUTPUT); pinMode(in4, OUTPUT);
  pinMode(enA, OUTPUT); pinMode(enB, OUTPUT);
  pinMode(leftSensor, INPUT);
  pinMode(rightSensor, INPUT);
}

void loop() {
  int left = digitalRead(leftSensor);
  int right = digitalRead(rightSensor);

  if (left == LOW && right == LOW) {
    // Both on white — go straight
    forward(150);
  } else if (left == HIGH && right == LOW) {
    // Left on black — turn right
    turnRight(120);
  } else if (left == LOW && right == HIGH) {
    // Right on black — turn left
    turnLeft(120);
  } else {
    // Both on black — stop or turn
    stopMotors();
  }
}

void forward(int speed) {
  digitalWrite(in1, HIGH); digitalWrite(in2, LOW);
  digitalWrite(in3, HIGH); digitalWrite(in4, LOW);
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
```

### Three-Sensor Improvement

Add a center sensor for smoother following:

```cpp
const int leftSensor = 2, centerSensor = 3, rightSensor = 4;

void loop() {
  int left = digitalRead(leftSensor);
  int center = digitalRead(centerSensor);
  int right = digitalRead(rightSensor);

  if (center == HIGH) {
    forward(150);       // On the line — go straight
  } else if (left == HIGH) {
    turnRight(130);     // Drifting left — correct right
  } else if (right == HIGH) {
    turnLeft(130);      // Drifting right — correct left
  } else {
    search();           // Lost the line — search
  }
}

void search() {
  // Spin slowly to find the line
  digitalWrite(in1, HIGH); digitalWrite(in2, LOW);
  digitalWrite(in3, LOW);  digitalWrite(in4, HIGH);
  analogWrite(enA, 100);
  analogWrite(enB, 100);
  delay(200);
}
```

### PID Control (Advanced — Optional)

For smoother, faster line following, use PID (Proportional-Integral-Derivative) control. This continuously adjusts motor speeds based on how far off the line the robot is.

The basic idea:
- **Proportional:** Turn harder the further off the line you are
- **Integral:** Correct for sustained drift
- **Derivative:** Dampen oscillations

For this course, the basic sensor logic above is sufficient. PID is an advanced topic for after you have a working robot.

### Testing

1. Create a track: lay black electrical tape on a white floor (or white tape on a dark floor)
2. Start with wide curves — sharp turns are harder
3. Adjust speed: slower = more reliable, faster = more exciting
4. Tune sensor thresholds if needed (use Serial.print to debug)

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Basic logic: read sensors → decide direction → adjust motor speeds
> - Two sensors: detect drift left/right, correct by turning
> - Three sensors: center sensor keeps robot on line, side sensors correct drift
> - Lost the line? Spin slowly to search
> - PID control is optional — basic logic works for learning
> - Test on simple tracks first, then add curves

---

## Module 5 Quiz

**4 Questions — Passing score: 3/4**

1. **How does an IR line sensor detect a black line?**
   - A) Black absorbs IR light, so less reflects back to the sensor
   - B) Black emits more IR light
   - C) Black is colder than white
   - D) Black conducts electricity better

2. **When both left and right sensors detect the black line, the robot should:**
   - A) Speed up
   - B) Turn left
   - C) Stop or turn (intersection or end of line)
   - D) Reverse

3. **Why do you need a motor driver instead of connecting motors to Arduino pins?**
   - A) Motors need AC power
   - B) Arduino pins cannot supply enough current
   - C) Motors need 12V
   - D) Arduino cannot control speed

4. **What should the robot do when it loses the line (all sensors read white)?**
   - A) Shut down
   - B) Spin slowly to search for the line
   - C) Drive forward at full speed
   - D) Reverse at full speed

**Answers:** 1-A, 2-C, 3-B, 4-B

---

## Certificate Checkpoint: Module 5 Complete

**You've learned:**
- How IR sensors detect lines on surfaces
- How to build a line follower chassis
- How to wire motors, sensors, and Arduino together
- How to write basic line-following code

**Certificate:** Complete the quiz with 3/4 correct answers to unlock your Module 5 certificate and proceed to Module 6.
