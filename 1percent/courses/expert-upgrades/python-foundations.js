/* ============================================================
   Expert Layer data — Python Foundations: Think Like a Programmer
   Grounded in: PEP 8 / pythonic idiom practice, PEP 668 and venv
   discipline, f-string debugging, stdlib-first philosophy,
   Python's professional domains (data, automation, AI).
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners write Python like translated Java: index loops, manual counters, everything in one file. Experts write *pythonic* code — comprehensions over loops where clarity survives, iteration directly over items (not \`range(len(x))\`), tuple unpacking, and truthiness ("if not items"). The second mark of experience: **environment discipline**. Professionals never install packages globally — every project gets a virtual environment from day one (python3 -m venv .venv), dependencies live in a pinned requirements.txt, and "works on my machine" bugs are structurally prevented rather than debugged. It is the habit that separates people who *use* Python from people who *ship* it.`,

  howExpertsWork: `They use the REPL and \`python -i\` as a lab: try the expression, check \`type()\` and \`repr()\`, then write the real code. They reach for the **standard library first** — \`collections.Counter\`, \`itertools\`, \`pathlib\`, \`json\`, \`csv\` — because the stdlib is tested, documented, and already installed; pip is for when the stdlib genuinely cannot. Naming follows PEP 8 (snake_case functions, PascalCase classes, UPPER_CASE constants) not because of pedantry but because Python's ecosystem reads uniformly — the language's superpower is that any Python file *looks* like any other. And they add \`if __name__ == "__main__":\` to every script from day one, so code is importable *and* runnable — the hinge on which testing and reuse swing.`,

  toolsOfTheTrade: [
    ['Virtual environments (venv/uv)', 'Per-project isolated package installs', 'Ends dependency hell; makes projects shareable and reproducible'],
    ['f-string debugging', 'print(f"{value=}") prints name *and* value', 'The fastest debugging habit in Python, zero tooling required'],
    ['python REPL / -i flag', 'Interactive experimentation with your loaded script', 'Test an idea in 10 seconds before writing 10 lines'],
    ['collections & itertools', 'Counter, defaultdict, deque, groupby, chain', 'Delete 10 lines of manual bookkeeping with one import'],
    ['pathlib over os.path', 'Path("data") / "raw" / "file.csv"', 'Readable, cross-platform, composable path handling']
  ],

  insiderMoves: [
    '`python -m pip install ...` inside venvs (not bare pip) — guarantees the package lands in *this* interpreter, ending the classic "installed but ImportError" mystery.',
    'Use \`enumerate(items, start=1)\` when you need the index — and *notice* that needing the index is usually a smell that a zip() or dict is cleaner.',
    'Master one-liner dict patterns: \`dict.fromkeys\`, \`{k: v for k, v in ... if cond}\`, and \`max(items, key=...)`. Sorting by multiple keys is \`sorted(items, key=lambda x: (x.city, -x.age))\` — the tuple trick replaces 20 lines.',
    'Read tracebacks bottom-up: the last line is the error, the frame above it is *your* code most likely responsible. Tracebacks are not punishments; they are the most detailed error messages in any language — read them fully.',
    'Keep scripts importable: logic in functions, the runner under \`if __name__ == "__main__":\`, and constants at top. This one structure makes every script testable for free.',
    'Use \`python -m json.tool data.json\` (and friends: -m http.server, -m venv, -m timeit) — Python ships a pocket-knife of tiny servers, formatters, and profilers most users never open.'
  ],

  fieldScenarios: [
    {
      situation: 'The script runs on your laptop, crashes on a teammate\'s machine.',
      beginner: 'Adds "pip install everything" to the README and hopes.',
      expert: 'Freezes reality: requirements.txt pinned to the versions that work, venv instructions as three commands, and — five minutes spent now — a one-line check script that verifies the versions before the crash can happen.',
      why: 'Reproducibility is a deliverable, not a courtesy; unrepeatable analysis is unreviewable analysis.'
    },
    {
      situation: 'A data file has 2,000 rows and the script takes 90 seconds.',
      beginner: 'Rewrites the whole thing "for performance" with clever tricks.',
      expert: 'Times the parts (timeit, or a quick cProfile run), finds it is one regex recompiled per row, compiles it once — 90 seconds becomes 4. Then stops. Measured fixes; no speculative optimisation.',
      why: 'Profiling beats intuition; most "slow Python" is one hot line, not the language.'
    },
    {
      situation: 'You need to merge two lists of dicts by ID and count duplicates.',
      beginner: 'Nested loops with counters and edge-case flags (30 lines, probably buggy).',
      expert: 'Counter for the counts, dict comprehension for the merge, and done in six readable lines using stdlib pieces whose edge cases are already solved by people smarter than both of us.',
      why: 'The stdlib is 30 years of edge cases pre-solved; reaching for it first is the pythonic habit.'
    }
  ],

  expertMistakes: [
    'Mutable default arguments: def add_item(item, items=[]) — the list is created *once* and shared across every call. The classic Python footgun; the fix is None-default + create inside.',
    'Bare except: pass. It swallows every error including KeyboardInterrupt, making bugs invisible; experts catch the *specific* exception and let everything else crash loudly.',
    'pip install globally "just to try it". Six months later nothing installs cleanly anywhere. venv from minute one — it costs 15 seconds.',
    'Treating floats as money (same trap as every language) and trusting == on floats: use math.isclose for comparisons, Decimal or integer cents for currency.'
  ],

  dayInTheLife: `A junior data analyst starts the morning in the REPL, testing the CSV parsing idea on 10 rows before writing the script — \`python -i\` with the file loaded. The script grows in the project's venv; a new dependency (openpyxl) goes into requirements.txt immediately with a comment on why. Mid-morning, the weekly report script crashes on a row with an empty date — the traceback is read bottom-up, the fix is a guard clause with a clear comment, and a test is added using a 5-row fixture file so the bug cannot return. After lunch: the report is refactored — print statements become a small function returning a dict (now importable by next month's dashboard). Before leaving, they run the whole thing once from a clean venv to prove the README's three install commands actually work — because a teammate will try them tomorrow.`,

  hiringLens: `Python screens test idiom and hygiene, not trivia: "read this code and simplify it" (are comprehensions applied? does range(len()) disappear?), "your script fails on another machine — walk me through it" (venv? pinned requirements? traceback read correctly?). For data roles, pandas questions replace loops — but the senior tell remains: they profile before optimising and they *read the traceback* before googling. A candidate who mentions virtual environments unprompted is signalling they have shipped something real, because nobody who has shared a broken environment forgets.`,

  firstJobReality: `In your first months, Python is the glue job: rename 3,000 files, clean a CSV that "someone else's system" produced, scrape a page, schedule a report. These unglamorous scripts are where pythonic habits compound — pathlib, comprehensions, venvs, argparse — and where your reputation as "the person who automates things" is built. The career secret of Python: it is the language of *leverage*; the colleague who turns a 3-hour weekly task into a 3-minute script gets remembered at promotion time.`,

  exercises: [
    'Take any old script of yours and pythonise it: kill every range(len()), add comprehensions where they improve clarity, switch os.path to pathlib, and put the runner under if __name__ == "__main__". Diff before/after and count the deleted lines.',
    'Create a project from scratch the professional way: venv → requirements.txt with two pinned packages → a script with argparse → README with 3 install commands → verify from a *fresh* venv. Keep this skeleton forever.',
    'Find the slowest loop in your code. Measure with timeit, fix the one hot line (compile the regex, join the strings, precompute the lookup), re-measure, and record the ratio.',
    'Deliberately trigger three classic bugs and read the tracebacks fully: a NameError from a typo, a KeyError from a dict, and a TypeError from None. Practise narrating what each traceback says before looking at the code.'
  ],

  goDeeper: [
    '"Fluent Python" by Luciano Ramalho — the book that turns Python users into Python programmers; read slowly, a chapter a week.',
    'PEP 8 and the "Zen of Python" (import this) — the taste document of the language, 19 lines.',
    '"Automate the Boring Stuff with Python" (free online) — the practical bible for glue-job Python.',
    'Python docs: "Data Structures" and "itertools" tutorials — the stdlib tour that replaces half your pip installs.'
  ],

  onePercent: `experts write Python that reads like Python: comprehensions, stdlib first, venv always — and they treat tracebacks as the detailed, polite error reports they are, reading them fully before touching a line of code.`
};
