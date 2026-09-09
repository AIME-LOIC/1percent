# Module 8: Capstone Project — Show Your Robot

**Status:** FREE — Open access for all learners
**Duration:** 2 weeks
**Lessons:** 2

---

## Lesson 8.1: Choose Your Challenge

**Duration:** 15 minutes | **Type:** Reading

---

You have learned electronics, sensors, motors, and code. Now build something that shows what you can do.

### Challenge Options

Pick ONE challenge to complete:

**Challenge A: Maze Solver**
- Robot navigates a maze made of walls
- Uses ultrasonic sensor to detect walls
- Uses state machine to make decisions at junctions
- Finishes when it reaches the exit

**Challenge B: Line Follower + Obstacle Avoider**
- Robot follows a line on the ground
- When it encounters an obstacle on the line, it goes around it
- Returns to the line after the obstacle
- Combines skills from Modules 5 and 6

**Challenge C: Light Chaser**
- Robot follows a light source (flashlight or phone screen)
- Uses 2-3 photoresistors facing different directions
- Turns toward the brightest light
- Demonstrates analog sensing and motor control

**Challenge D: Remote Control Robot**
- Robot controlled via Bluetooth (HC-05 module) or IR remote
- Phone or remote sends commands: forward, backward, left, right
- Demonstrates wireless communication
- Requires HC-05 Bluetooth module (RWF 1,000-2,000) or IR remote (RWF 500-1,000)

**Challenge E: Build Your Own**
- Propose your own challenge
- Must use at least 2 sensors and 2 motors
- Must have autonomous decision-making (not just remote control)
- Describe your plan and get approval from the community

### Parts List for All Challenges

| Component | Quantity | Notes |
|---|---|---|
| Arduino Uno | 1 | Or Nano, ESP8266 |
| L298N motor driver | 1 | Or transistor H-bridge |
| DC gear motors + wheels | 2 | Salvage from toys if needed |
| HC-SR04 ultrasonic | 1 | For challenges A, B |
| TCRT5000 IR sensor | 2-3 | For challenges A, B |
| SG90 servo | 1 | For sensor scanning |
| Photoresistor | 2-3 | For challenge C |
| HC-05 Bluetooth | 1 | For challenge D only |
| Battery holder | 1 | 4×AA or 2S LiPo |
| Chassis | 1 | Cardboard, acrylic, wood |
| Wires, breadboard, glue | — | As needed |

### No Parts? Improvise

- **Chassis:** Cardboard, old plastic container, CD cases
- **Motors:** Salvage from old toys, printers, DVD drives
- **Wheels:** Bottle caps with rubber bands for grip
- **Sensors:** DIY with LEDs and phototransistors
- **Bluetooth:** Skip it — use wired serial from a laptop for testing

### Planning Your Build

Before building, write a plan:

1. **Which challenge** am I choosing?
2. **What parts** do I need? What do I already have?
3. **What am I building first?** (Chassis → motors → sensors → code)
4. **How will I test** each part before combining?
5. **What might go wrong** and how will I fix it?

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Choose one challenge: Maze Solver, Combo Robot, Light Chaser, Remote Control, or your own
> - All challenges need 2+ sensors and 2 motors
> - Improvise parts from cardboard, old toys, and household items
> - Plan before building: parts → build order → testing → troubleshooting
> - Document your progress — photos and videos help you learn and share

---

## Lesson 8.2: Build, Document, Share

**Duration:** 15 minutes | **Type:** Reading

---

This lesson guides you through building, documenting, and sharing your capstone project.

### Build Order

Follow this sequence regardless of which challenge you chose:

**Week 1:**

| Day | Task |
|---|---|
| Day 1 | Gather all parts. Test each component individually (motors spin, sensors read, Arduino compiles) |
| Day 2 | Build chassis. Mount motors and wheels. Verify motors spin correctly |
| Day 3 | Mount sensors. Wire to Arduino. Test sensor readings in Serial Monitor |
| Day 4 | Write basic code: forward, turn, stop. Test on open floor |
| Day 5 | Write challenge-specific code (maze logic, line following, light tracking) |

**Week 2:**

| Day | Task |
|---|---|
| Day 6-7 | Debug and tune. Adjust speeds, thresholds, timing |
| Day 8 | Test in final environment (maze, track, light setup) |
| Day 9 | Fix any remaining issues |
| Day 10 | Record a video of your robot in action |

### Documentation

For each step, take photos and short notes:
- **Photo of the wiring** — helps you remember and helps others replicate
- **Screenshot of your code** — or paste it in a text file
- **Notes on problems** — what went wrong and how you fixed it

### Sharing Your Work

1. **Post a video** in the course community showing your robot completing the challenge
2. **Share your code** — paste it in a community post or on GitHub
3. **Write a short description:** What challenge you chose, what parts you used, what you learned

### What Good Looks Like

Your robot does not need to be perfect. It needs to:
- ✅ Complete the challenge (even slowly, even imperfectly)
- ✅ Make autonomous decisions (not just pre-programmed movements)
- ✅ Use at least 2 sensors and 2 motors
- ✅ Be documented (photos + code)

### Beyond the Capstone

After completing this course, you can:
- **Join the 1% Rwanda tech community** for mentorship and projects
- **Build more complex robots:** Robotic arms, hexapods, autonomous cars
- **Enter competitions:** Robotics competitions across Rwanda and Africa
- **Teach others:** Share what you learned with your school or community
- **Explore further:** ROS (Robot Operating System), computer vision, machine learning

---

### 📄 PDF Summary

> **Key Takeaways:**
>
> - Follow the build order: test parts → chassis → sensors → code → tune → document
> - Take photos and notes at every step
> - Your robot must: complete the challenge, make decisions, use 2+ sensors, be documented
> - Share your video and code in the community
> - This is just the beginning — robotics is a lifelong learning journey

---

## Module 8 Quiz

**4 Questions — Passing score: 3/4**

1. **What is the minimum requirement for the capstone robot?**
   - A) It must look professional
   - B) It must use at least 2 sensors and 2 motors, and make autonomous decisions
   - C) It must complete the maze challenge
   - D) It must cost less than RWF 10,000

2. **Why should you test each component individually before combining them?**
   - A) It is faster
   - B) It makes it easier to find which part is not working
   - C) Components degrade if used together
   - D) You do not — just build everything at once

3. **What should you document during your build?**
   - A) Nothing — just show the final robot
   - B) Photos of wiring, screenshots of code, notes on problems and fixes
   - C) Only the code
   - D) Only the final video

4. **What is the most important thing about your capstone robot?**
   - A) It must be fast
   - B) It must complete the challenge and demonstrate what you learned
   - C) It must use the most expensive parts
   - D) It must look like a commercial robot

**Answers:** 1-B, 2-B, 3-B, 4-B

---

## Final Certificate: Robotics Course Complete 🎉

**You've completed all 8 modules:**

1. ✅ Electronics Fundamentals
2. ✅ Your First Circuit — LED Patterns and Sound
3. ✅ Microcontroller Basics — Arduino
4. ✅ Sensors and Actuators
5. ✅ Building a Line Follower Robot
6. ✅ Building an Obstacle Avoider Robot
7. ✅ Robot Code Patterns
8. ✅ Capstone Project — Show Your Robot

**You are now a certified 1% Robotics graduate.**

You can build circuits, program microcontrollers, sense the world, make things move, and make autonomous decisions. These are the foundations of robotics — and you built them with your own hands.

Share your capstone video with #1percentRobotics and inspire the next generation of builders in Rwanda and across Africa.

**Keep building. Keep learning. Keep pushing the 1%.**
