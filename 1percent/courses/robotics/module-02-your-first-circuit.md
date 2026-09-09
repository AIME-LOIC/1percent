# Module 2: Your First Circuit — LED Patterns and Sound

**Status:** FREE — Open access for all learners
**Duration:** 1 week
**Lessons:** 3

---

## Lesson 2.1: Multiple LEDs — Series and Parallel in Practice

**Duration:** 20 minutes | **Type:** Reading

---

You lit one LED in Module 1. Now let us light several and learn the difference between wiring them in series vs parallel.

### Three LEDs in Series

Connect them end-to-end: Battery (+) → Resistor → LED1 → LED2 → LED3 → Battery (-)

```
  +9V ──[R 330Ω]──>|──>|──>|── GND
                   D1  D2  D3
```

**What happens:** The 9V is split across three LEDs. Each gets roughly 3V. If the LEDs are identical white or blue LEDs (forward voltage ~3V), this works perfectly. One resistor controls current for all three.

**When to use series:** When your LEDs have a combined forward voltage close to your supply voltage. Simple, fewer components.

### Three LEDs in Parallel (with Resistors)

Each LED needs its own resistor to share the current safely.

```
         ┌──[R]──>|──┐
  +9V ──┼──[R]──>|──┼── GND
         └──[R]──>|──┘
```

**What happens:** Each LED gets the full 9V but its own resistor limits current. All three glow at the same brightness independently.

**When to use parallel:** When you want LEDs to work independently. If one burns out, the others keep going.

### Without Resistors in Parallel

If you connect three LEDs in parallel to 9V without resistors, each LED tries to draw maximum current. They will all burn out. **Never skip resistors with LEDs.**

### Improvised Components

No LEDs available? Try these:
- **3V coin cell battery + LED from a broken toy:** Desolder LEDs from old electronics
- **Colored Christmas lights:** Some are simple LEDs with resistors inside
- **Phone flashlight LED:** Works but runs hot without current limiting — use briefly

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Series LEDs share voltage, one resistor for all
> - Parallel LEDs each need their own resistor
> - Series is simpler; parallel is more resilient
> - Always use resistors with LEDs, even in parallel

---

## Lesson 2.2: The Blinking LED — Your First Automated Circuit

**Duration:** 25 minutes | **Type:** Reading

---

A blinking LED is the "Hello World" of electronics. To make an LED blink without a microcontroller, we use a simple circuit called an **astable multivibrator**.

### The 555 Timer Chip

The 555 timer is the most popular chip in the world. It costs RWF 200-500 and can blink LEDs, generate tones, and pulse signals.

**Pinout (8-pin DIP package):**

```
    ┌─────┐
  1 │●    │ 8  ← VCC (+)
  2 │     │ 7  ← Discharge
  3 │     │ 6  ← Threshold
  4 │     │ 5  ← Control
  5 │     │ 4  ← Reset
  6 │     │ 3  ← Output
  7 │     │ 2  ← Trigger
  8 │     │ 1  ← GND
    └─────┘
```

### Blink Circuit: 555 + LED

**Parts needed:**
- 1× 555 timer chip
- 1× LED
- 1× 220Ω resistor (for LED)
- 1× 10kΩ resistor (R1)
- 1× 10kΩ resistor (R2)
- 1× 10µF capacitor (C1)
- 1× 0.01µF capacitor (C2)
- 9V battery + clip
- Breadboard + wires

**Connections:**
1. Pin 1 → GND (battery -)
2. Pin 8 → VCC (battery +)
3. Pin 4 → VCC
4. Pin 2 → Pin 6 (connect together)
5. Pin 7 → Pin 6 through R2 (10kΩ)
6. Pin 7 → VCC through R1 (10kΩ)
7. Pin 2 → GND through C1 (10µF)
8. Pin 5 → GND through C2 (0.01µF)
9. Pin 3 → 220Ω resistor → LED (+) → GND

**What happens:** The LED blinks on and off. The timing depends on R1, R2, and C1.

**Blink speed formula:** Period = 0.693 × (R1 + 2×R2) × C1
- With R1=10kΩ, R2=10kΩ, C1=10µF: Period ≈ 0.2 seconds (5 Hz fast blink)

**To slow it down:** Use larger resistors (100kΩ) or larger capacitor (100µF).

### No 555 Timer? Improvise

**Option 1:** Use an Arduino (covered in Module 3) — just use `digitalWrite()` and `delay()`.

**Option 2:** Two-transistor astable circuit. Uses two NPN transistors (BC547), two capacitors, and two resistors. More complex but uses common parts.

**Option 3:** Mechanical blinker — use a relay with a capacitor. Loud but works.

### Two LEDs Alternating

Modify the circuit: connect a second LED to pin 3 through a different resistor. Connect the first LED to VCC through a resistor and pin 3 to GND through it. When pin 3 is high, one LED is on. When low, the other.

```
  VCC ──[R]──>|──┐
              D1  │  Pin 3
  GND ──[R]──>|──┘
              D2
```

This gives you an alternating blink — like hazard lights.

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - The 555 timer blinks LEDs automatically using a simple circuit
> - Blink speed depends on resistor and capacitor values
> - Larger R or C = slower blink
> - Without a 555, use Arduino, two transistors, or improvise
> - Always include current-limiting resistors with LEDs

---

## Lesson 2.3: The Piezo Buzzer — Making Sound

**Duration:** 20 minutes | **Type:** Reading

---

Sound is just vibration. A piezo buzzer converts electrical signals into vibration, creating sound. You have heard them in alarm clocks, microwaves, and greeting cards.

### How a Piezo Buzzer Works

A piezo element is a thin ceramic disc. When you apply voltage, it bends slightly. When you remove voltage, it snaps back. If you apply voltage repeatedly (on-off-on-off), the disc vibrates at that frequency, creating sound.

**Frequency = pitch.** 440 Hz = middle A note. 1000 Hz = a high beep. 100 Hz = a low hum.

### Passive vs Active Buzzers

**Active buzzer:** Has a built-in oscillator. Connect to power and it makes a single tone. Simple but limited.

**Passive buzzer:** No built-in oscillator. You control the frequency by switching voltage on and off rapidly. More flexible — you can play different notes.

**For this course:** Use a passive buzzer. You control the pitch.

### Buzzer Circuit

**Parts:**
- 1× passive piezo buzzer
- 1× NPN transistor (BC547 or 2N2222)
- 1× 1kΩ resistor
- Arduino or 555 timer for signal
- Battery

**Why the transistor?** The Arduino pin cannot supply enough current to drive a buzzer directly. The transistor acts as a switch — a small signal from the Arduino controls a larger current from the battery to the buzzer.

```
  Arduino Pin 9 ──[1kΩ]── Base
                           │
  Battery (+) ──────────── Collector
                           │
                      Emitter ── GND
                           │
                    Buzzer: one leg to Collector, other to Battery (+)
```

**What happens:** When the Arduino pin goes HIGH, the transistor turns on, current flows through the buzzer, and it makes sound. Change the on-off frequency to change the pitch.

### No Buzzer? Improvise

- **Bend a piece of thin metal (tin can lid) and mount it over a magnet.** Connect a wire to the metal. When you pulse current through the wire, the metal vibrates against the magnet.
- **Old greeting card speaker:** Cut out the sound module from a musical greeting card.
- **Your phone speaker:** Not ideal for circuits but works for testing audio signals.

### Playing a Note

The frequency for musical notes:

| Note | Frequency |
|---|---|
| C4 (Middle C) | 262 Hz |
| D4 | 294 Hz |
| E4 | 330 Hz |
| F4 | 349 Hz |
| G4 | 392 Hz |
| A4 | 440 Hz |
| B4 | 494 Hz |
| C5 (High C) | 523 Hz |

To play a note, switch the buzzer on and off at the note's frequency. For 440 Hz, each cycle takes 1/440 = 2.27 milliseconds (1.14ms on, 1.14ms off).

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Piezo buzzers convert electrical pulses into sound
> - Passive buzzers let you control pitch; active buzzers play one tone
> - Use a transistor to drive the buzzer from a microcontroller pin
> - Frequency = pitch: 440 Hz = A4, 262 Hz = Middle C
> - Improvise with tin cans, greeting card speakers, or phone speakers

---

## Module 2 Quiz

**4 Questions — Passing score: 3/4**

1. **In a series circuit with 3 LEDs, why do all LEDs stop if one burns out?**
   - A) They share the same voltage
   - B) There is only one path for current — when it breaks, everything stops
   - C) They are connected in parallel
   - D) The battery dies

2. **What is the purpose of a resistor in an LED circuit?**
   - A) To make the LED brighter
   - B) To limit current so the LED does not burn out
   - C) To change the LED color
   - D) To store energy

3. **How do you make a piezo buzzer play a higher pitch?**
   - A) Use more voltage
   - B) Use a larger capacitor
   - C) Increase the frequency of the on-off signal
   - D) Use a lower frequency

4. **Why use a transistor to drive a buzzer from an Arduino?**
   - A) The Arduino cannot produce sound
   - B) The Arduino pin cannot supply enough current for the buzzer
   - C) The transistor makes the sound louder
   - D) The buzzer needs AC power

**Answers:** 1-B, 2-B, 3-C, 4-B

---

## Certificate Checkpoint: Module 2 Complete

**You've learned:**
- How to wire multiple LEDs in series and parallel
- How to build a blinking LED circuit with a 555 timer
- How piezo buzzers work and how to drive them
- How to improvise with available materials

**Certificate:** Complete the quiz with 3/4 correct answers to unlock your Module 2 certificate and proceed to Module 3.
