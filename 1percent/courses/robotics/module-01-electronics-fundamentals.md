# Module 1: Electronics Fundamentals

**Status:** FREE — Open access for all learners
**Duration:** 1 week
**Lessons:** 3

---

## Lesson 1.1: Voltage, Current, and Resistance — The Three Wires

**Duration:** 20 minutes | **Type:** Reading

---

Every electronic device you will ever build runs on three invisible forces: voltage, current, and resistance. You cannot see them, but you can understand them with one simple analogy.

### The Water Analogy

Imagine a water tank connected to a pipe.

**Voltage** is the water pressure. It pushes the water through the pipe. In electronics, voltage is measured in **volts (V)** and comes from a battery or power supply. A fresh AA battery gives you 1.5V. A USB port gives 5V. A wall adapter might give 12V.

**Current** is the flow rate — how much water moves through the pipe per second. In electronics, current is measured in **amperes (A)** or milliamperes (mA). Most hobby circuits use 10-500mA. Too much current and something burns. Too little and nothing works.

**Resistance** is how narrow the pipe is. A narrow pipe resists water flow. In electronics, resistance is measured in **ohms (Ω)**. Resistors are tiny components that add resistance to a circuit, controlling how much current flows.

### Ohm's Law: The One Formula You Need

**Voltage = Current × Resistance**

Or: **V = I × R**

This formula connects all three. If you know any two, you can calculate the third.

**Example:** You have a 9V battery and a 450Ω resistor. How much current flows?

I = V ÷ R = 9 ÷ 450 = 0.02A = 20mA

That is enough current to light an LED without burning it.

### Direct Current (DC) vs Alternating Current (AC)

Everything in this course uses **DC** — current that flows in one direction, like water through a single pipe. DC comes from batteries, USB ports, and most hobby power supplies.

**AC** is what comes out of your wall outlet. It switches direction 50 times per second. Do not plug hobby electronics into a wall outlet.

### Practical Rules

1. **Never connect voltage directly across a component without resistance.** A wire straight from a battery to an LED will burn the LED instantly.
2. **Match your voltage to your components.** Most Arduino boards run on 5V. Most sensors run on 3.3V or 5V. Check before connecting.
3. **When in doubt, start with a higher resistance.** You can always reduce resistance later. You cannot un-burn a component.

---

### Circuit Diagram: Battery + Resistor + LED

```
    +9V Battery
      ┌───┐
  (+) │   │ (-)
      └─┬─┘
        │
      [R]  450Ω Resistor
        │
       LED  (long leg = +)
        │
        │
  ──────┴────── Back to battery (-)
```

**What this shows:** Current flows from battery (+), through the resistor (which limits current), through the LED (which lights up), and back to battery (-).

---

### Hands-On: Feel the Resistance

**What you need:** 1 battery (9V or 2×AA), 1 resistor (any value), your fingers.

1. Hold the resistor by its metal legs
2. Touch one leg to battery (+) and one leg to battery (-)
3. You will feel nothing — resistance blocks current, and this circuit has no output
4. Now replace the resistor with a plain wire — the battery may get warm (do not hold it long)

**What you learned:** The resistor controlled the flow. Without it, the battery had nothing limiting the current.

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Voltage (V) = pressure, Current (I) = flow, Resistance (R) = restriction
> - Ohm's Law: V = I × R
> - DC flows one direction (batteries). AC is wall outlets — avoid for hobby electronics
> - Always use resistance to limit current. Start high, reduce later.

---

## Lesson 1.2: Reading Resistors and Building Your First Circuit

**Duration:** 25 minutes | **Type:** Reading

---

Resistors are the most common component you will use. They control current, protect LEDs, and form the basis of sensor circuits. Learning to read their values is essential.

### How to Read a Resistor

Most hobby resistors have colored bands. The color code tells you the resistance value.

**4-band resistor code:**

| Color | Value |
|---|---|
| Black | 0 |
| Brown | 1 |
| Red | 2 |
| Orange | 3 |
| Yellow | 4 |
| Green | 5 |
| Blue | 6 |
| Violet | 7 |
| Gray | 8 |
| White | 9 |
| Gold | ±5% tolerance |
| Silver | ±10% tolerance |

**How to read:** First band = first digit. Second band = second digit. Third band = multiplier (number of zeros). Fourth band = tolerance.

**Example:** Brown-Black-Red-Gold
- Brown = 1, Black = 0, Red = ×100, Gold = ±5%
- Value: 10 × 100 = **1,000Ω (1kΩ)** ±5%

**Quick reference for common values:**
- 220Ω: Red-Red-Brown
- 330Ω: Orange-Orange-Brown
- 470Ω: Yellow-Violet-Brown
- 1kΩ: Brown-Black-Red
- 10kΩ: Brown-Black-Orange

### No Resistor? Improvise

If you do not have the exact resistor you need:
- **Two resistors in series:** Add their values (1kΩ + 1kΩ = 2kΩ)
- **Two resistors in parallel:** Divide (two 1kΩ in parallel = 500Ω)
- **A pencil lead:** Sharpen a pencil, expose the graphite core, touch wires to each end. Graphite has resistance. It is not precise, but it works for experiments.

### Your First Circuit: LED with Resistor

**What you need:**
- 1 LED (any color)
- 1 resistor (220Ω-470Ω)
- 1 battery holder with 2×AA batteries (3V) or a 9V battery + clip
- Jumper wires
- 1 breadboard (optional but helpful)

**Circuit:**

```
Battery (+) → Resistor → LED (+, long leg) → LED (-, short leg) → Battery (-)
```

**Steps:**
1. Identify the LED legs: the **longer leg** is positive (+), the **shorter leg** is negative (-)
2. Connect battery (+) to one leg of the resistor
3. Connect the other leg of the resistor to the LED's long leg (+)
4. Connect the LED's short leg (-) to battery (-)
5. The LED should light up

**If it does not light up:**
- LED is backwards — flip it
- Resistor value too high — try a lower value
- Battery is dead — check voltage with a multimeter if available

### The Breadboard: Your Circuit Playground

A breadboard lets you build circuits without soldering. Rows are connected internally:

```
  + + + + + + + + +  (power rails, connected horizontally)
  ─ ─ ─ ─ ─ ─ ─ ─
  1  2  3  4  5  6   (rows connected vertically in groups of 5)
  ─ ─ ─ ─ ─ ─ ─ ─
  7  8  9  10 11 12  (rows connected vertically in groups of 5)
  ─ ─ ─ ─ ─ ─ ─ ─
  - - - - - - - - -  (ground rails, connected horizontally)
```

**Rules:**
- Components in the same row (same column, numbers 1-5) are connected
- The long rails on the sides are for power (+) and ground (-)
- Never put both legs of a component in the same connected row — it shorts out

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Resistor color bands: digit, digit, multiplier, tolerance
> - Common values: 220Ω (red-red-brown), 1kΩ (brown-black-red), 10kΩ (brown-black-orange)
> - LED: long leg = positive (+), short leg = negative (-)
> - Always use a resistor with an LED
> - Breadboard rows are connected in groups of 5

---

## Lesson 1.3: Series, Parallel, and the Multimeter

**Duration:** 20 minutes | **Type:** Reading

---

Understanding series and parallel circuits helps you build more complex projects. The multimeter is the tool that lets you see what is actually happening.

### Series Circuits: One Path

In a series circuit, components are connected end-to-end. Current has only one path.

```
Battery (+) → LED1 → LED2 → LED3 → Battery (-)
```

**Properties:**
- Same current flows through all components
- Voltage is shared (9V battery split across 3 LEDs = 3V each)
- If one component fails (burns out), all stop working

**Use when:** You want components to share voltage (like string lights).

### Parallel Circuits: Multiple Paths

In a parallel circuit, components are connected side by side. Current splits into multiple paths.

```
         ┌── LED1 ──┐
Battery (+)──┤           ├── Battery (-)
         └── LED2 ──┘
```

**Properties:**
- Same voltage across all branches
- Current is shared (each branch gets some)
- If one branch fails, the others keep working

**Use when:** You want components to get the same voltage (like house wiring).

### Series vs Parallel: LED Example

**3 LEDs in series on 9V battery:**
- Each LED gets 3V
- Works if each LED needs 3V (like white LEDs at ~3V forward voltage)

**3 LEDs in parallel on 9V battery:**
- Each LED gets 9V — too much! They will burn without resistors
- Each branch needs its own resistor

### The Multimeter: Your Electronic Eyes

A multimeter measures voltage, current, and resistance. Even a cheap one (RWF 5,000-15,000) is invaluable.

**Voltage measurement:**
1. Set dial to DC Voltage (V with straight lines)
2. Connect red probe to positive, black probe to negative
3. Read the value on screen

**Resistance measurement:**
1. Set dial to Ω (ohms)
2. Connect probes across the component (power off!)
3. Read the value

**Continuity test:**
1. Set dial to the sound symbol (蜂鸣器)
2. Touch probes together — you hear a beep
3. Touch probes to two points — if they beep, they are connected

### Use Continuity to Debug

If your circuit does not work:
1. Power off
2. Use continuity mode
3. Check each wire connection from battery (+) to battery (-)
4. Find where the circuit breaks

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Series: one path, shared voltage, one failure stops all
> - Parallel: multiple paths, same voltage, independent branches
> - Multimeter measures voltage (V), resistance (Ω), and continuity (beep)
> - Use continuity mode to find broken connections
> - A cheap multimeter (RWF 5,000-15,000) is worth the investment

---

## Module 1 Quiz

**4 Questions — Passing score: 3/4**

1. **What is voltage?**
   - A) How much current flows
   - B) The pressure that pushes current through a circuit
   - C) The resistance in a wire
   - D) The brightness of an LED

2. **A resistor has bands: Brown-Black-Red. What is its value?**
   - A) 10Ω
   - B) 100Ω
   - C) 1,000Ω (1kΩ)
   - D) 10,000Ω (10kΩ)

3. **In a series circuit with 3 LEDs on a 9V battery, each LED gets approximately:**
   - A) 9V
   - B) 4.5V
   - C) 3V
   - D) 1V

4. **You connect an LED directly to a 9V battery without a resistor. What happens?**
   - A) The LED glows brightly
   - B) Nothing happens
   - C) The LED burns out instantly
   - D) The battery explodes

**Answers:** 1-B, 2-C, 3-C, 4-C

---

## Certificate Checkpoint: Module 1 Complete

**You've learned:**
- Voltage, current, and resistance and how they relate
- How to read resistor color codes
- How to build a basic LED circuit
- Series vs parallel circuits
- How to use a multimeter

**Certificate:** Complete the quiz with 3/4 correct answers to unlock your Module 1 certificate and proceed to Module 2.
