/* ============================================================
   Expert Layer data — Robotics
   Grounded in: professional embedded practice — non-blocking
   millis() state machines (never delay()), watchdog timers and
   brown-out detection, calibration routines, common-ground and
   power-supply discipline, signal-first debugging.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners build robots that work on the desk and die on the floor. Experts know the difference is **power and timing**: 90% of "my robot goes crazy" is electrical (motors brown-out the microcontroller when they kick in, sensors share noisy ground) and 9% is blocking code. So the professional habits are electrical first: motors on their own supply (never the Arduino 5V pin), **common ground** between every board and battery, capacitors across motor supplies, and a brown-out detector (built into the chip — make sure it is enabled) so the MCU resets cleanly instead of doing something mad when voltage sags. The timing habit: production firmware never uses \`delay()\` — it runs a **state machine on millis()**, because a blocked loop cannot read sensors, and a robot that cannot read sensors is a missile.`,

  howExpertsWork: `They calibrate before every meaningful run: sensor thresholds are measured on *today's* track under *today's* light (a line follower tuned yesterday is a coin flip today), and the calibration numbers live in one place at the top of the sketch — named constants, not magic numbers buried in logic. Their loop structure is always the same shape: read inputs → update the state machine → drive outputs → repeat, with every non-blocking timer as a comparison against millis(). They also debug by **signal, not by hope**: a test LED blinked in key states, Serial prints at every decision point (with a marker like [IR] or [SONAR] so the stream is readable), and the loop period printed occasionally — because "how long does one loop take?" is the question that exposes every timing bug.`,

  toolsOfTheTrade: [
    ['millis() state machines', 'Non-blocking timing: scheduled actions via millis() comparisons', 'The loop never blocks; sensors are always being read — the difference between a toy and a robot'],
    ['Watchdog timer', 'Hardware timer that resets the MCU if the loop hangs (wdt_enable)', 'A hung robot stops; a watchdog robot recovers. Professionals ship recovery, not perfection'],
    ['Multimeter discipline', 'Voltage checks before, during, and after wiring changes', '5 minutes of measuring replaces hours of "why is the servo twitching"'],
    ['Named calibration constants', 'THRESHOLD_LEFT = 512, not "512" buried mid-sketch', 'Re-tuning takes minutes, not archaeology; magic numbers are how bugs hide'],
    ['Serial state tracing', 'Bracketed prints at every state change ([SEARCH] → [ATTACK])', 'You can watch the robot *think*; mysterious behaviour becomes a readable log']
  ],

  insiderMoves: [
    'Wire the common ground first, every single build: battery negative, motor-driver ground, and Arduino ground joined at one point. Half of all "random" resets and sensor lies are floating or missing grounds.',
    'Power the servo/motor rail separately and add a big electrolytic capacitor (470-1000µF) across it — servos cause voltage dips on startup that reset the whole board; the cap absorbs the kick.',
    'Write the state machine on paper before the code: boxes (IDLE, SEARCH, FOLLOW, AVOID) and arrows (what event moves you between states). If the diagram is wrong, the code will be too — but the diagram is cheap to fix.',
    'Blink a status LED per state (slow blink = searching, fast = tracking). Then watch the robot from across the room and *know* what it is thinking without a laptop attached.',
    'Read sensors N times and take the median, not the average: an ultrasonic reading of 3cm between two 200cm readings is a spike; the median ignores it, the average believes it.',
    'Log the battery voltage in the loop (a simple divider on an analog pin). "Robot behaved oddly" almost always correlates with "battery hit 6.8V" — pros prove it, beginners argue about it.'
  ],

  fieldScenarios: [
    {
      situation: 'The robot works perfectly on the bench, then resets every time the motors engage on the floor.',
      beginner: 'Rewrites the code, convinced it is a software bug.',
      expert: 'Measures: multimeter on the 5V rail while motors start shows the dip. Fix is electrical — separate motor supply, common ground, capacitor across the motor rail. The code was never wrong; the power was.',
      why: 'Motor startup current sags the shared supply; a brown-out reset mid-run looks exactly like a software crash.'
    },
    {
      situation: 'The line follower tracks perfectly for 10 seconds, then loses the line and spins.',
      beginner: 'Raises the speed or moves the sensors "a bit" and re-tests blindly.',
      expert: 'Prints the sensor values during the failure and finds the drift: after 10 seconds the motors heat up, battery sags, and the LED-emitter current drops — so the "black" threshold is wrong. Fix: recalibrate against battery voltage, or lower speed, and log voltage to confirm.',
      why: 'Robots are systems; a symptom that appears *with time* is usually power or heat, not logic.'
    },
    {
      situation: 'The obstacle avoider occasionally drives straight into the wall.',
      beginner: 'Increases the avoid distance and hopes.',
      expert: 'Adds loop-period printing and discovers a 350ms blocking Sonar-pulseIn wait combined with a delay() elsewhere — the robot is blind for a third of every second. The fix is the state machine rewrite: every wait becomes a millis() comparison, the loop drops to 2ms, and the wall never wins again.',
      why: 'A blocked loop is a blind robot; timing bugs disguise themselves as sensor bugs.'
    }
  ],

  expertMistakes: [
    'Powering motors from the Arduino 5V regulator. The regulator supplies ~500mA; a single stall draws 1-2A and browns everything out. Separate supply + common ground, always.',
    'Trusting one sensor reading. Ultrasonic and IR readings are noisy; pros read-and-median, and treat any single absurd value as noise rather than truth.',
    'Tuning code on a dying battery. Half of all "it behaved differently today" mysteries are voltage; check the pack before rewriting working code.',
    'Skipping the failsafe: what does your robot do when it *loses* the line or *stops seeing* the wall? Pros define the default state (stop, search, or slow) on purpose — the default behaviour is a design decision, not an accident.'
  ],

  dayInTheLife: `A robotics club mentor runs the pre-build ritual with a student team: multimeter across the battery (8.1V — good), common ground verified by continuity beep, motor supply on its own pack, capacitor seated. Then calibration: white paper reads 820, black tape reads 340, threshold set to 580 and written as a named constant at the top of the sketch. First run: the robot finds the line, follows three corners, then wobbles off on the second straight. The debug: Serial shows [FOLLOW] with sensor values 810/815/820 — the robot is *blind*; the IR emitter wire has shaken loose on the bump of corner two. Ten minutes, one connector re-seated, and — the pro step — a hot-glue dot on the connector so vibration cannot undo it again. Second run: clean lap. The debrief sentence the mentor wants the team to remember: "we didn't change any code; we trusted the signals over the story."`,

  hiringLens: `Robotics and embedded interviews (internships, labs, competitions) probe the two instincts: electrical hygiene ("where do the grounds meet?", "what happens to 5V when the motor stalls?") and timing discipline ("why is delay() banned?", "walk me through your state machine"). Candidates who mention watchdogs, calibration routines, and voltage logging sound like people who have *finished* robots — because those habits only form after builds have failed. Portfolio tip: a video of the robot working is table stakes; a write-up of one failure and its diagnosis ("it resets when motors kick — here is the scope trace") is what gets you remembered.`,

  firstJobReality: `Your first real embedded task will be "make it reliable" on someone else's half-working robot or device — and reliability in this field is a checklist, not a talent: separate supplies, common ground, brown-out enabled, watchdog on, no delay(), medians on sensors, calibration constants named, voltage logged. Work the checklist before touching anything clever; half the time the device simply starts working, and you will have learned the field's most important secret: experts are not luckier — they are *systematic*, and the checklist is the system.`,

  exercises: [
    'Rewrite any delay()-based sketch of yours as a millis() state machine with a paper diagram first. Then add one task that was previously impossible — reading a button while blinking — and feel why delay() had to go.',
    'Add the reliability checklist to a working robot: watchdog enable, brown-out verify (burn the fuse setting on AVR), battery-voltage logging, and a per-state status LED. Test each one by simulating its failure.',
    'Deliberately create the classic brown-out: power a motor and MCU from one supply and watch the reset. Then fix it properly (separate supply + cap + common ground) and document before/after with the multimeter.',
    'Build a calibration mode into your line follower: on startup, sample white and black for 3 seconds, compute and store the threshold, and print it. Race yesterday\'s hardcoded version against it — the difference is why pros calibrate.'
  ],

  goDeeper: [
    'Arduino docs: "Bare Minimum Code" and the millis() timing tutorials — then Nick Gammon\'s legendary forum posts on interrupts, watchdogs, and power (gammon.com.au).',
    '"Practical Electronics for Inventors" (Scherz & Monk) — the reference for the electrical half of robotics.',
    'The ATmega/ESP datasheet sections on brown-out detection and watchdog timer — reading the actual chip docs is the line between hobbyist and engineer.',
    'James Bruton and Andrey Sporykhin-style build logs on YouTube — watch *how* experienced builders diagnose failures, not just what they build.'
  ],

  onePercent: `experts respect the two invisible forces — power and time: separate supplies with a common ground, no blocking code, watchdogs on, sensors medianed, calibration named and logged — and their robots finish the race because the boring things were done first.`
};
