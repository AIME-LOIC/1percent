# Module 7: Robot Code Patterns

**Status:** FREE — Open access for all learners
**Duration:** 1 week
**Lessons:** 3

---

## Lesson 7.1: Functions — Organizing Your Code

**Duration:** 20 minutes | **Type:** Reading

---

As your robot code grows, it becomes a mess of `digitalWrite` and `delay` calls. Functions let you organize code into reusable blocks.

### What Is a Function?

A function is a named block of code that does one thing. You write it once, then call it by name whenever you need it.

```cpp
void forward(int speed) {
  digitalWrite(in1, HIGH);
  digitalWrite(in2, LOW);
  digitalWrite(in3, HIGH);
  digitalWrite(in4, LOW);
  analogWrite(enA, speed);
  analogWrite(enB, speed);
}
```

Now instead of writing 6 lines every time you want to go forward, you just write:
```cpp
forward(150);
```

### Function Structure

```cpp
returnType functionName(parameters) {
  // code
  return value;  // if not void
}
```

- **`void`** = function returns nothing
- **`int`** = function returns an integer
- Parameters are inputs (like `int speed`)
- `return` sends a value back to the caller

### Functions With Return Values

```cpp
long getDistance() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  return duration * 0.0343 / 2;
}
```

Usage: `long dist = getDistance();`

The function calculates distance and gives it back to you.

### Organizing a Robot Program

```cpp
// === SETUP ===
void setup() {
  initMotors();
  initSensors();
  Serial.begin(9600);
}

// === MAIN LOOP ===
void loop() {
  long distance = getDistance();
  if (distance < 20) {
    avoidObstacle();
  } else {
    forward(150);
  }
}

// === MOTOR FUNCTIONS ===
void initMotors() { ... }
void forward(int speed) { ... }
void turnLeft(int speed) { ... }
void turnRight(int speed) { ... }
void stopMotors() { ... }

// === SENSOR FUNCTIONS ===
void initSensors() { ... }
long getDistance() { ... }

// === BEHAVIOR FUNCTIONS ===
void avoidObstacle() { ... }
void searchForLine() { ... }
```

This structure makes your code readable and easy to modify.

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Functions organize code into named, reusable blocks
> - `void` functions do work but return nothing; `int`/`long` functions return values
> - Use parameters to make functions flexible (e.g., `forward(speed)`)
> - Organize code: setup → main loop → motor functions → sensor functions → behaviors
> - Readable code is easier to debug and modify

---

## Lesson 7.2: State Machines — Making Smart Decisions

**Duration:** 25 minutes | **Type:** Reading

---

A state machine is a way to make your robot have different "modes" or "behaviors." Instead of one big loop, the robot switches between states based on what it senses.

### What Is a State?

A state is a condition your robot can be in:
- **FORWARD:** Driving straight
- **TURNING:** Making a turn
- **SCANNING:** Looking for obstacles
- **SEARCHING:** Looking for a line
- **STOPPED:** Waiting

The robot is always in exactly one state. It switches states based on sensor input.

### The State Variable

```cpp
enum State { FORWARD, TURNING, SCANNING, STOPPED };
State currentState = FORWARD;
```

An `enum` is a list of named states. The variable `currentState` holds which state the robot is in.

### The State Machine Loop

```cpp
void loop() {
  switch (currentState) {
    case FORWARD:
      driveForward();
      if (getDistance() < 20) {
        currentState = SCANNING;
      }
      break;

    case SCANNING:
      stopMotors();
      leftDist = scan(170);
      rightDist = scan(10);
      if (leftDist > rightDist) {
        currentState = TURNING;
        turnDirection = LEFT;
      } else {
        currentState = TURNING;
        turnDirection = RIGHT;
      }
      break;

    case TURNING:
      if (turnDirection == LEFT) turnLeft(150);
      else turnRight(150);
      delay(500);
      currentState = FORWARD;
      break;

    case STOPPED:
      stopMotors();
      break;
  }
}
```

**How it works:**
1. Robot is in FORWARD state
2. Sensor detects obstacle → switch to SCANNING
3. Scan finds clearer path → switch to TURNING
4. Turn completes → switch back to FORWARD
5. Repeat

### Why State Machines?

**Without state machine:**
```cpp
void loop() {
  forward(150);
  delay(1000);
  turnLeft(150);
  delay(500);
  forward(150);
  delay(500);
  turnRight(150);
  // ... endless sequence with no logic
}
```

**With state machine:**
- Robot makes decisions based on real-time sensor data
- Easy to add new states (CHARGING, FOLLOWING, PATROLLING)
- Easy to debug (print `currentState` to Serial Monitor)

### Adding More States

**FOLLOWING state:** Robot follows an object at a fixed distance
```cpp
case FOLLOWING:
  long dist = getDistance();
  if (dist > 30) forward(120);
  else if (dist < 15) backward(120);
  else stopMotors();  // At good distance
  break;
```

**PATROL state:** Robot moves in a pattern until it detects something
```cpp
case PATROL:
  forward(100);
  delay(2000);
  turnRight(120);
  delay(400);
  break;
```

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - A state machine gives your robot different modes of behavior
> - Use `enum` to define states, `switch` to handle them
> - Each state has its own logic and transition conditions
> - State machines are easier to debug and extend than linear code
> - Add states for following, patrolling, charging, or any behavior

---

## Lesson 7.3: Debugging — Finding and Fixing Bugs

**Duration:** 20 minutes | **Type:** Reading

---

Every programmer spends more time debugging than writing code. Here is how to find and fix problems in your robot.

### The Serial Monitor: Your Debugging Window

```cpp
Serial.begin(9600);

// In loop:
Serial.print("Distance: ");
Serial.print(getDistance());
Serial.println(" cm");

Serial.print("State: ");
Serial.println(currentState);
```

Open **Tools → Serial Monitor** in Arduino IDE. You will see real-time data from your robot. This is the single most useful debugging tool.

### Common Problems and Solutions

**Problem: Robot does not move**
- Check motor wiring (are OUT1-OUT4 connected to motors?)
- Check battery (is it charged?)
- Check L298N jumper (is the 5V enable jumper in?)
- Test: upload a simple sketch that just runs motors forward

**Problem: Robot spins in circles**
- One motor is wired backwards — swap OUT1 and OUT2 (or OUT3 and OUT4)
- One motor is dead — test each motor individually

**Problem: Sensors give wrong readings**
- Sensor too high above ground (should be 5-10mm)
- Sensor angled wrong (should face straight down)
- Wiring error — check connections with multimeter continuity test
- Test: print sensor values to Serial Monitor while moving over black/white surfaces

**Problem: Arduino resets randomly**
- Motor current draw causes voltage drop — add 100µF capacitor across power rails
- Separate motor battery from Arduino power
- Use shorter/thicker wires for motor connections

**Problem: Ultrasonic sensor gives erratic readings**
- Sensor too close to servo motor (vibration affects readings)
- Object too far or at a bad angle
- Add `delay(50)` between readings to let the sensor settle

### The Debugging Process

1. **Identify the symptom:** What is the robot doing wrong?
2. **Narrow down:** Is it hardware (wiring) or software (code)?
3. **Add prints:** Use `Serial.print()` to see what the code thinks is happening
4. **Test in isolation:** Test motors alone, sensors alone, code alone
5. **Fix one thing at a time:** Change one variable, test, repeat

### Testing Checklist

Before running your robot on a track:

- [ ] Motors spin correctly (forward, reverse, both sides)
- [ ] Sensors read correct values (black vs white, close vs far)
- [ ] Arduino does not reset when motors start
- [ ] Battery is charged
- [ ] Wheels are aligned and grip the surface
- [ ] Code compiles without errors
- [ ] Serial Monitor shows expected values

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - `Serial.print()` is your most important debugging tool
> - Common issues: wiring, power, sensor alignment, code logic
> - Test components in isolation before combining
> - Arduino resets usually mean power issues — add capacitors
> - Follow the checklist before every test run

---

## Module 7 Quiz

**4 Questions — Passing score: 3/4**

1. **What is the benefit of using functions in robot code?**
   - A) They make code run faster
   - B) They organize code into reusable, readable blocks
   - C) They reduce memory usage
   - D) They eliminate the need for variables

2. **In a state machine, what happens when the robot is in the TURNING state and finishes turning?**
   - A) The robot shuts down
   - B) It transitions to another state (usually FORWARD)
   - C) It stays in TURNING forever
   - D) It resets the Arduino

3. **How do you see sensor values while the robot is running?**
   - A) Look at the robot's display
   - B) Use `Serial.print()` and check the Serial Monitor
   - C) Measure with a multimeter while driving
   - D) You cannot — just guess

4. **The Arduino resets when motors start. What is the most likely cause?**
   - A) Software bug
   - B) Voltage drop from motor current draw
   - C) Battery is too powerful
   - D) Code is too long

**Answers:** 1-B, 2-B, 3-B, 4-B

---

## Certificate Checkpoint: Module 7 Complete

**You've learned:**
- How to use functions to organize robot code
- How state machines create smart robot behavior
- How to debug with Serial Monitor
- Common problems and how to fix them

**Certificate:** Complete the quiz with 3/4 correct answers to unlock your Module 7 certificate and proceed to Module 8.
