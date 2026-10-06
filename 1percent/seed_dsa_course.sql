-- ============================================================
-- Seed: Data Structures & Algorithms — The LeetCode Playbook
-- ============================================================
-- Run this in the Supabase SQL Editor.
--
-- WHAT THIS COURSE IS
--   The 20 core patterns behind almost every LeetCode problem,
--   taught the way the platform teaches best: read the pattern,
--   see the template, then SOLVE real auto-graded challenges.
--
-- GRADING
--   All 18 challenges use `expected_output` — the grader EXECUTES
--   the submitted Python with python3 and compares stdout, so
--   students must write real working algorithms (no keyword
--   guessing, and the anti-echo detector blocks hardcoding the
--   printed answer).
--
-- RE-RUNNABLE: deletes the course by slug first (including its
-- challenges/lessons), then re-inserts everything fresh.
--
-- NOTE: variables are prefixed v_ on purpose — a variable named
-- `course_id` collides with the challenges.course_id column inside
-- PL/pgSQL ("column reference is ambiguous").

DO $$
DECLARE
  v_course_id UUID := uuid_generate_v4();
  v_l1  UUID := uuid_generate_v4();
  v_l2  UUID := uuid_generate_v4();
  v_l3  UUID := uuid_generate_v4();
  v_l4  UUID := uuid_generate_v4();
  v_l5  UUID := uuid_generate_v4();
  v_l6  UUID := uuid_generate_v4();
  v_l7  UUID := uuid_generate_v4();
  v_l8  UUID := uuid_generate_v4();
  v_l9  UUID := uuid_generate_v4();
  v_l10 UUID := uuid_generate_v4();
  v_l11 UUID := uuid_generate_v4();
  v_l12 UUID := uuid_generate_v4();
  v_l13 UUID := uuid_generate_v4();
  v_l14 UUID := uuid_generate_v4();
  v_l15 UUID := uuid_generate_v4();
  v_l16 UUID := uuid_generate_v4();
  v_l17 UUID := uuid_generate_v4();
  v_l18 UUID := uuid_generate_v4();
  v_l19 UUID := uuid_generate_v4();
  v_l20 UUID := uuid_generate_v4();
BEGIN
  -- Make re-runs safe: drop any previous version of this course.
  -- Challenges must be deleted explicitly: their FK is ON DELETE SET NULL,
  -- so deleting only the course would leave them orphaned.
  DELETE FROM public.challenges
   WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'dsa-leetcode-playbook');
  DELETE FROM public.lessons
   WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'dsa-leetcode-playbook');
  DELETE FROM public.quizzes WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'dsa-leetcode-playbook');
  DELETE FROM public.courses WHERE slug = 'dsa-leetcode-playbook';

  -- 1. Insert course
  INSERT INTO public.courses (
    id, slug, title, description, icon, level, duration_weeks,
    is_published, sort_order
  ) VALUES (
    v_course_id,
    'dsa-leetcode-playbook',
    'Data Structures & Algorithms: The LeetCode Playbook',
    'Master the 20 core patterns behind almost every LeetCode problem — two pointers, sliding window, binary search, trees, heaps, backtracking, graphs and dynamic programming — by reading tight pattern notes and solving real auto-graded challenges in Python.',
    'brain',
    'intermediate',
    12,
    true,
    30
  );

  -- 2. Lessons
  INSERT INTO public.lessons (id, course_id, title, description, content_md, lesson_type, duration_min, sort_order, is_published)
  VALUES
  -- ── Lesson 1 ──────────────────────────────────────────────
  (
    v_l1, v_course_id,
    'Big-O: Measure Code Before It Runs',
    'Learn to read the cost of an algorithm: time, space, and the nested-loop trap.',
    E'## What you''ll learn\n\nLeetCode gives every problem a hidden **time limit**. Big-O is how you know, before you press Submit, whether your idea can survive a 10⁵-element input.\n\n## Concepts\n\n- **Big-O** = how work grows as input `n` grows. Constants are ignored: `3n` is just `O(n)`.\n- **O(1)** constant — dict lookup, stack push, array index\n- **O(log n)** — binary search: each step halves the input\n- **O(n)** — one pass over the data\n- **O(n log n)** — good sorting (Python `sorted()`)\n- **O(n²)** — nested loops over the same data (10⁵ input ⇒ ~10¹⁰ steps ⇒ TLE)\n- **O(2ⁿ)** — naive subsets/recursion without memoization\n- **Space** counts too: a dict of n items is O(n) extra memory.\n\n## Worked example\n\n```python\n# O(n^2): for each element, rescan the array\nnums = [2, 7, 11, 15]\nfor i in range(len(nums)):\n    for j in range(i + 1, len(nums)):\n        if nums[i] + nums[j] == 9:\n            print(i, j)\n\n# O(n): remember what you have seen in a dict\nseen = {}\nfor i, x in enumerate(nums):\n    if 9 - x in seen:\n        print(seen[9 - x], i)\n    seen[x] = i\n```\n\nBoth print `0 1`, but on an input of 100,000 numbers the first version does ~5 billion comparisons; the second does 100,000 dict operations. Same answer, different planet.\n\n> **Ask:** how many steps does this take?\n>\n> ```python\n> for i in range(n):\n>     j = 1\n>     while j < n:\n>         j *= 2\n> ```\n>\n> The outer loop is O(n), the inner halves (doubles) — O(log n) per outer step. Total: **O(n log n)**. Multiply loops, do not add them.\n\n## Complexity table you will reuse forever\n\n| Structure | Lookup | Insert | Delete |\n|---|---|---|---|\n| list | O(n) | O(1) end | O(n) middle |\n| dict / set | O(1) | O(1) | O(1) |\n| sorted list + bisect | O(log n) | O(n) | O(n) |\n| heap (heapq) | O(1) peek | O(log n) | O(log n) pop-min |\n\n## LeetCode reps\n\n- LC 1 Two Sum (easy) — the O(n²) → O(n) upgrade this lesson taught\n- LC 509 Fibonacci Number (easy) — feel O(2ⁿ) vs O(n)\n\n## Modify-this exercise\n\nRewrite the O(n²) triple-loop version of 3Sum (check all pairs of `i, j` plus `k`) in your head and write down its Big-O. Then predict: is O(n²) acceptable on LeetCode when `n ≤ 3000`? (Yes — ~9 million steps. Acceptance depends on n, not on the letter.)',
    'reading', 35, 1, true
  ),
  -- ── Lesson 2 ──────────────────────────────────────────────
  (
    v_l2, v_course_id,
    'Arrays & Hashing: The 80/20 Pattern',
    'Trade memory for speed: the frequency-map pattern behind dozens of easy problems.',
    E'## What you''ll learn\n\nThe single most useful trick on LeetCode: **when you find yourself rescanning the array, remember what you already saw in a dict.**\n\n## Concepts\n\n- `seen = {}` — map value → index (or value → count)\n- `collections.Counter(nums)` — frequency table in one line\n- `set(nums)` — O(1) membership tests, dedupe\n- The **complement question**: instead of searching for a pair, for each `x` ask "have I already seen `target - x`?"\n\n## Worked example\n\n```python\nfrom collections import Counter\n\nnums = [1, 1, 1, 2, 2, 3]\ncounts = Counter(nums)\nprint(counts[1])        # 3\nprint(counts.most_common(2))  # [(1, 3), (2, 2)]\n\n# Two Sum — the complement pattern\nnums = [2, 7, 11, 15]\ntarget = 9\nseen = {}\nfor i, x in enumerate(nums):\n    if target - x in seen:\n        print(seen[target - x], i)   # 0 1\n    seen[x] = i\n```\n\n## The pattern, in one sentence\n\n> **If brute force is "check every pair", store one side of the pair in a dict and look the other side up in O(1).**\n\nThis one move converts O(n²) into O(n) for: Two Sum, Contains Duplicate, Valid Anagram, Group Anagrams (key = sorted string or 26-count tuple), Top K Frequent, Two Sum on sorted arrays with a twist, Subarray Sum Equals K (with prefix sums — Lesson 5).\n\n> **Ask:** why store `seen[x] = i` *after* the lookup?\n>\n> So you never pair an element with itself. If you stored first, `target = 2x` would wrongly match index `i` with index `i`.\n\n## LeetCode reps\n\n- LC 1 Two Sum (easy) · LC 217 Contains Duplicate (easy)\n- LC 242 Valid Anagram (easy) · LC 49 Group Anagrams (medium)\n- LC 347 Top K Frequent Elements (medium)\n\n## Modify-this exercise\n\nGiven `s = "aacc"` and `t = "ccac"`, decide with pen and paper what `Counter(s) == Counter(t)` returns — then check in Python. Anagram means same **counts**, not same set.',
    'reading', 30, 2, true
  ),
  -- ── Lesson 3 ──────────────────────────────────────────────
  (
    v_l3, v_course_id,
    'Two Pointers: Converging & Fast/Slow',
    'Squeeze an array from both ends, or walk it at two speeds — O(n) where loops met O(n²).',
    E'## What you''ll learn\n\nTwo pointers turn many "scan all pairs" problems into a **single coordinated pass**. Two flavours:\n\n- **Converging** — one pointer at each end, move them toward each other\n- **Fast/slow** — both start at the head, one moves twice as fast (cycles, middles)\n\n## Concepts\n\n- Converging works on **sorted** (or symmetric) data — the sorted order tells you which pointer to move\n- `left, right = 0, len(a) - 1` then `while left < right:`\n- Fast/slow finds a cycle (Floyd) or the middle in one pass, no extra memory\n\n## Worked example\n\n```python\n# Pair with target sum in a SORTED array — O(n)\nnums = [2, 7, 11, 15]\ntarget = 9\nleft, right = 0, len(nums) - 1\nwhile left < right:\n    s = nums[left] + nums[right]\n    if s == target:\n        print(left, right)      # 0 3 -> wait, 2+15=17; real answer below\n        break\n    elif s < target:\n        left += 1               # sum too small: need a bigger left value\n    else:\n        right -= 1              # sum too big: shrink the right value\n\n# Palindrome check — the same skeleton, symmetric data\ntext = "racecar"\nleft, right = 0, len(text) - 1\nis_pal = True\nwhile left < right:\n    if text[left] != text[right]:\n        is_pal = False\n        break\n    left += 1\n    right -= 1\nprint(is_pal)   # True\n```\n\n> **Ask:** in the sorted-pair loop, why is it safe to move exactly one pointer per step?\n>\n> Because the array is sorted: if `nums[left] + nums[right]` is too small, no right value can fix it *for this left* — left must grow. Every step discards one impossible pair for good. That is the proof of O(n).\n\n## LeetCode reps\n\n- LC 167 Two Sum II (medium) · LC 125 Valid Palindrome (easy)\n- LC 11 Container With Most Water (medium) · LC 15 3Sum (medium)\n- LC 141 Linked List Cycle (easy) · LC 283 Move Zeroes (easy)\n\n## Modify-this exercise\n\n3Sum = fix `i`, then run the converging pair-search on `i+1..end`. Write down (no code yet) what the total complexity is: O(n) per fix × n fixes = **O(n²)** — the accepted solution.',
    'reading', 35, 3, true
  ),
  -- ── Lesson 4 ──────────────────────────────────────────────
  (
    v_l4, v_course_id,
    'Sliding Window: Grow and Shrink',
    'Turn "check every substring/subarray" into one O(n) sweep with a window that breathes.',
    E'## What you''ll learn\n\nWhenever a problem says **contiguous** subarray/substring with some constraint (max sum, no repeats, at most K distinct…), think sliding window.\n\n## Concepts\n\n- **Fixed window** — size `k` known: slide one step at a time, add the new element, drop the old\n- **Variable window** — grow `right` always; shrink `left` while the window breaks the rule\n- Keep window state in a dict/Counter so every check is O(1)\n- Each index enters and leaves the window at most once ⇒ **O(n)** total, despite the nested while\n\n## Worked example\n\n```python\n# Fixed: max sum of any k consecutive elements\nnums, k = [1, 8, 3, 2, 9, 4], 3\nwindow = sum(nums[:k])\nbest = window\nfor right in range(k, len(nums)):\n    window += nums[right] - nums[right - k]   # slide one step\n    best = max(best, window)\nprint(best)   # 15 -> [3, 2, 9]... check: 2+9+4=15 too; [8,3,2]=13\n\n# Variable: longest substring without repeating characters\ns = "abcabcbb"\nlast_seen = {}\nleft = best = 0\nfor right, ch in enumerate(s):\n    if ch in last_seen and last_seen[ch] >= left:\n        left = last_seen[ch] + 1          # jump past the previous ch\n    last_seen[ch] = right\n    best = max(best, right - left + 1)\nprint(best)   # 3\n```\n\n> **Ask:** why does the shrinking while-loop not make it O(n²)?\n>\n> `left` only ever moves **forward**, at most n times total across the whole run. The while repeats are paid for by earlier forward movement — this is *amortized* O(n). Two indexes, one pass, never backwards.\n\n## LeetCode reps\n\n- LC 643 Maximum Average Subarray I (easy) · LC 3 Longest Substring Without Repeating (medium)\n- LC 76 Minimum Window Substring (hard) · LC 424 Longest Repeating Character Replacement (medium)\n- LC 904 Fruit Into Baskets (medium) — "at most 2 distinct", the template verbatim\n\n## Modify-this exercise\n\nChange the variable-window template to solve "longest subarray with at most K distinct" for `nums = [1,2,1,2,3]`, `K = 2`. (Answer: 4 — `[1,2,1,2]`.) The only edit: the window state becomes a Counter and you shrink while `len(counter) > K`.',
    'reading', 40, 4, true
  ),
  -- ── Lesson 5 ──────────────────────────────────────────────
  (
    v_l5, v_course_id,
    'Prefix Sums: Precompute, Then Ask in O(1)',
    'Running totals convert range questions and subarray-target problems into dict lookups.',
    E'## What you''ll learn\n\nA **prefix sum** is a running total. It answers any range-sum question in O(1) — and paired with a dict, it counts subarrays that hit an exact target.\n\n## Concepts\n\n- `prefix[i] = nums[0] + … + nums[i-1]`; range sum `i..j` = `prefix[j+1] - prefix[i]`\n- **The key identity**: subarray `i+1..j` sums to `k` ⇔ `prefix[j] - prefix[i] == k` ⇔ `prefix[i] == prefix[j] - k`\n- So while scanning, store each running sum in a dict (sum → how many times seen) and look up `current - k`\n\n## Worked example\n\n```python\n# Range sums in O(1) after O(n) prep\nnums = [3, 1, 4, 1, 5]\nprefix = [0]\nfor x in nums:\n    prefix.append(prefix[-1] + x)\nprint(prefix[4] - prefix[1])   # sum of nums[1..3] = 1+4+1 = 6\n\n# Subarray Sum Equals K — LC 560\nnums, k = [1, 1, 1], 2\ncount = 0\nseen = {0: 1}          # empty prefix sums to 0, once\nrun = 0\nfor x in nums:\n    run += x\n    count += seen.get(run - k, 0)   # earlier prefixes that complete a k-subarray\n    seen[run] = seen.get(run, 0) + 1\nprint(count)   # 2\n```\n\n> **Ask:** why does `seen = {0: 1}` fix the "subarray starts at index 0" case?\n>\n> A subarray `0..j` sums to k when `prefix[j] == k` — i.e. when `run - k == 0`. Seeding the dict with `{0: 1}` makes that lookup succeed without special-casing the start.\n\n## LeetCode reps\n\n- LC 303 Range Sum Query (easy) · LC 560 Subarray Sum Equals K (medium)\n- LC 525 Contiguous Array (medium) · LC 974 Subarray Sums Divisible by K (medium)\n- LC 238 Product of Array Except Self (medium) — same prefix idea, multiplied\n\n## Modify-this exercise\n\nCompute the prefix array of `[2, -1, 3, 5]` on paper, then verify: what is `sum(nums[1..2])` via prefixes? (-1+3 = 2 = `prefix[3] - prefix[1]` = 4 - 2.)',
    'reading', 30, 5, true
  ),
  -- ── Lesson 6 ──────────────────────────────────────────────
  (
    v_l6, v_course_id,
    'Stack I: Matching, Undo, Nesting',
    'Last-in-first-out is how code reads brackets, undoes moves, and remembers history.',
    E'## What you''ll learn\n\nA **stack** (LIFO) is the structure for anything that must match the *most recent* open item: brackets, undo, backspacing, iterated paths.\n\n## Concepts\n\n- `stack = []`, push = `append`, pop = `pop()` — all O(1)\n- **Matching pattern**: push openers, pop-and-verify on closers\n- Valid ⇔ every closer matches the latest opener AND the stack ends empty\n\n## Worked example\n\n```python\ns = "([{}])"\npairs = {")": "(", "]": "[", "}": "{"}\nstack = []\nvalid = True\nfor ch in s:\n    if ch in pairs:                      # a closer\n        if not stack or stack.pop() != pairs[ch]:\n            valid = False\n            break\n    else:                                # an opener\n        stack.append(ch)\nif stack:                                # leftovers never closed\n    valid = False\nprint(valid)   # True\n```\n\n> **Ask:** what does the string `"(("` produce? And `"())"`?\n>\n> `"(("` leaves a non-empty stack → invalid. `"())"` pops `(`, then pops from an **empty** stack → invalid. Both failure modes are handled: empty-at-pop, and non-empty-at-end. Miss either and the solution is wrong.\n\n## Where else the stack appears\n\n- LC 71 Simplify Path — split by `/`, `..` pops\n- LC 844 Backspace String Compare — `#` pops\n- LC 20 Valid Parentheses, LC 1047 Remove All Adjacent Duplicates — matching verbatim\n- Nested iteration (iterators, DFS with an explicit stack — Lesson 16)\n\n## LeetCode reps\n\n- LC 20 Valid Parentheses (easy) · LC 1047 Remove All Adjacent Duplicates (easy)\n- LC 844 Backspace String Compare (easy) · LC 71 Simplify Path (medium)\n\n## Modify-this exercise\n\nExtend the matcher so `"*"` means "any single character is fine": make `"([*])"` and `"(*)"` both valid. (Hint: when popping, accept the match OR a `*`.)',
    'reading', 30, 6, true
  ),
  -- ── Lesson 7 ──────────────────────────────────────────────
  (
    v_l7, v_course_id,
    'Stack II: The Monotonic Stack',
    'Keep a stack sorted, and the next-greater-element family solves itself.',
    E'## What you''ll learn

The **monotonic stack** answers, for every element, the nearest smaller-or-greater element around it — in O(n). It looks like magic until you see the invariant: the stack always holds elements **in sorted order**, and each element is pushed and popped exactly once.

## Concepts

- While the new element is **greater** than the stack top, the top just found its *next greater element* — pop it
- What remains on the stack is always strictly decreasing from bottom to top
- Works for next-greater on the right, next-smaller, previous-greater — flip the comparison

## Worked example

```python
# Daily Temperatures (LC 739): days until a warmer temperature
T = [73, 74, 75, 71, 69, 72, 76, 73]
ans = [0] * len(T)
stack = []            # indexes; temperatures strictly decreasing
for i, t in enumerate(T):
    while stack and T[stack[-1]] < t:
        j = stack.pop()   # i is the first warmer day for index j
        ans[j] = i - j
    stack.append(i)
print(ans)   # [1, 1, 4, 2, 1, 1, 0, 0]
```

> **Ask:** why is this O(n) when it has a while inside a for?
>
> Each index is pushed once and popped at most once. Total pushes + pops ≤ 2n ⇒ **O(n) amortized**. Same argument as the sliding window: nested loops are fine when the inner work is bounded by total movement.

## LeetCode reps

- LC 739 Daily Temperatures (medium) · LC 496 Next Greater Element I (easy)
- LC 503 Next Greater Element II (medium, circular — loop twice) · LC 84 Largest Rectangle in Histogram (hard)
- LC 42 Trapping Rain Water (hard — two pointers also work, Lesson 3)

## Modify-this exercise

Flip one comparison in the template to output, for each day, the days until a **colder** day. Test on `[73, 74, 75, 71, 69, 72, 76, 73]` — day 0 (73) waits 4 days for 71.',
    'reading', 35, 7, true
  ),
  -- ── Lesson 8 ──────────────────────────────────────────────
  (
    v_l8, v_course_id,
    'Linked Lists: Pointers Are the Structure',
    'Rewire nodes in place: reversal, merging, fast/slow middles and cycle detection.',
    E'## What you''ll learn

A linked list is just nodes and **arrows**. Every classic list problem is solved by carefully moving three arrows at a time — no arrays, no copying.

## Concepts

- Node: `val` + `next`. You never "insert into" a list — you rewire `next` pointers
- **In-place reversal**: walk the list, flipping each arrow backwards; keep `prev`, `curr`, `nxt` straight
- **Dummy head** `dummy = ListNode(0, head)`: a fake start node removes all edge cases (empty list, deleting the head)
- Fast/slow pointers: middle of a list, cycle detection (Lesson 3)

## Worked example

```python
class ListNode:
    def __init__(self, val=0, nxt=None):
        self.val = val
        self.next = nxt

# Reverse in place — LC 206
def reverse_list(head):
    prev = None
    curr = head
    while curr:
        nxt = curr.next      # save the arrow before you break it
        curr.next = prev     # flip it
        prev = curr          # step both pointers forward
        curr = nxt
    return prev              # new head

# Build 1->2->3->4->5 and print reversed values
head = ListNode(1, ListNode(2, ListNode(3, ListNode(4, ListNode(5)))))
rev = reverse_list(head)
vals = []
while rev:
    vals.append(str(rev.val))
    rev = rev.next
print(" ".join(vals))   # 5 4 3 2 1
```

> **Ask:** why does `prev = None` as the initial value matter?
>
> The original head must become the tail, and the tail points to nothing. `prev = None` gives that final arrow a valid target. Start with anything else and you build a **cycle** — the #1 linked-list bug.

## LeetCode reps

- LC 206 Reverse Linked List (easy) · LC 21 Merge Two Sorted Lists (easy)
- LC 141 Linked List Cycle (easy) · LC 19 Remove Nth Node From End (medium)
- LC 143 Reorder List (medium) — reversal + fast/slow + merge, all in one

## Modify-this exercise

Using the dummy-head trick, delete the node `val == 3` from `1->2->3->4` in one pass. (Walk with `prev` while `prev.next` exists; when `prev.next.val == 3`, do `prev.next = prev.next.next`.)',
    'reading', 40, 8, true
  ),
  -- ── Lesson 9 ──────────────────────────────────────────────
  (
    v_l9, v_course_id,
    'Binary Search: Halve the World',
    'The O(log n) template, boundary variants, and searching the answer space itself.',
    E'## What you''ll learn

Binary search is not "search a sorted array" — it is a **decision principle**: if a yes/no question splits the remaining possibilities in half, you can find the boundary in O(log n). Master three variants: exact, leftmost/rightmost, and *binary search on the answer*.

## Concepts

- Invariant style: keep a half-open range `[lo, hi)` where the answer definitely lives
- Termination: `while lo < hi`, then `lo` is the answer — no off-by-one dance
- **Leftmost** match: even on success, keep searching left (`hi = mid`)
- **On the answer space**: if predicate `can(x)` is monotone (false…false true…true), binary search the smallest `x` that returns true

## Worked example

```python
# Leftmost position of target in a sorted array — LC 704/34 style
nums, target = [1, 3, 5, 5, 5, 7, 9], 5
lo, hi = 0, len(nums)
while lo < hi:
    mid = (lo + hi) // 2
    if nums[mid] < target:
        lo = mid + 1
    else:
        hi = mid          # nums[mid] >= target: answer is mid or left of it
print(lo)                 # 2 (first of the three 5s)

# Binary search ON THE ANSWER — LC 875 Koko Eating Bananas
piles, h = [3, 6, 7, 11], 8
def hours_needed(k):
    return sum((p + k - 1) // k for p in piles)   # ceiling division
lo, hi = 1, max(piles)
while lo < hi:
    mid = (lo + hi) // 2
    if hours_needed(mid) <= h:
        hi = mid          # mid works: try slower eating
    else:
        lo = mid + 1      # too slow: eat faster
print(lo)                 # 4
```

> **Ask:** in Koko, why is `hours_needed(k)` monotone in `k`?
>
> Eating faster (bigger k) never takes more hours. Monotone predicate ⇒ binary search applies even though the array is not sorted. This leap — *search the answer, not the data* — unlocks LC 410, 1011, 1283, 875.

## LeetCode reps

- LC 704 Binary Search (easy) · LC 34 First and Last Position (medium)
- LC 33 Search in Rotated Sorted Array (medium) · LC 875 Koko Eating Bananas (medium)
- LC 4 Median of Two Sorted Arrays (hard — the famous partition search)

## Modify-this exercise

Adjust the leftmost template to find the **rightmost** 5: flip the comparison so success keeps searching right. Verify you get index 4 on `[1, 3, 5, 5, 5, 7, 9]`.',
    'reading', 40, 9, true
  ),
  -- ── Lesson 10 ─────────────────────────────────────────────
  (
    v_l10, v_course_id,
    'Sorting & Intervals: Sweep the Timeline',
    'Sort by start, sweep by end: the interval family and custom keys.',
    E'## What you''ll learn

Interval problems look scary and reduce to one move: **sort by start time**, then walk through checking overlap with the previous interval.

## Concepts

- Sort key: `intervals.sort(key=lambda iv: iv[0])` (or a tuple key for tie-breaks)
- Two intervals `[a, b]` and `[c, d]` (sorted by start) **overlap** iff `c <= b`
- Merging: extend the last merged interval while `c <= current_end`; otherwise start a new one
- Counting problems (meeting rooms, non-overlapping removals) use the same sweep with different bookkeeping

## Worked example

```python
# Merge Intervals — LC 56
intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]
intervals.sort(key=lambda iv: iv[0])
merged = []
for start, end in intervals:
    if merged and start <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], end)   # extend the last one
    else:
        merged.append([start, end])
print(merged)   # [[1, 6], [8, 10], [15, 18]]
```

> **Ask:** why must the merged endpoint use `max(...)` when extending?
>
> A later interval can be fully **contained** in the previous one: `[[1, 10], [2, 3]]`. Extending with plain `end` would *shrink* `[1, 10]` to `[1, 3]` — wrong. Sort order guarantees starts are ordered; it says nothing about ends.

## LeetCode reps

- LC 56 Merge Intervals (medium) · LC 57 Insert Interval (medium)
- LC 435 Non-overlapping Intervals (medium) · LC 252/253 Meeting Rooms (easy/medium)
- LC 179 Largest Number (medium — custom sort key: compare a+b vs b+a)

## Modify-this exercise

Adapt the sweep to count the **maximum number of overlapping** meetings from `[[0, 30], [5, 10], [15, 20]]`. (Hint: sort starts and ends separately; advance a pointer over whichever comes first. Answer: 2.)',
    'reading', 35, 10, true
  ),
  -- ── Lesson 11 ─────────────────────────────────────────────
  (
    v_l11, v_course_id,
    'Recursion & Divide-and-Conquer',
    'Trust the base case: solving subproblems is how trees, backtracking and DP are born.',
    E'## What you''ll learn

Recursion is a contract: **if the function is correct for smaller inputs, it is correct for this one.** Every tree, backtracking and DP problem later in this course is recursion wearing different clothes.

## Concepts

- Every recursion needs: (1) a **base case** that returns without recursing, (2) progress toward it, (3) a combine step
- **Divide and conquer**: split, solve halves, combine — merge sort is the archetype: T(n) = 2T(n/2) + O(n) ⇒ O(n log n)
- Python default recursion limit ≈ 1000 — for deep recursion use `sys.setrecursionlimit()` or convert to iteration

## Worked example

```python
# pow(x, n) in O(log n) — LC 50, divide and conquer
def my_pow(x, n):
    if n == 0:
        return 1
    half = my_pow(x, n // 2)
    if n % 2 == 0:
        return half * half
    return half * half * x

print(my_pow(2, 10))   # 1024
print(my_pow(2.0, -2)) # 0.25 (negate: 1 / my_pow(x, -n))
```

> **Ask:** why is `my_pow` O(log n) while a loop multiplying n times is O(n)?
>
> Each call halves the exponent: 10 → 5 → 2 → 1 → 0 — only 4 calls for n=10. And it computes `half` **once** and squares it. The naive recursive version `x * pow(x, n-1)` is O(n); the doubly-recursive `pow(n/2) + pow(n/2)` (recomputed twice) is O(n) disguised as divide-and-conquer. Squaring the *cached* half is the whole trick.

## LeetCode reps

- LC 50 Pow(x, n) (medium) · LC 169 Majority Element (easy — divide or counting)
- LC 53 Maximum Subarray (medium — divide & conquer version exists; Kadane in Lesson 18)
- LC 215 Kth Largest Element (medium — quickselect, partition-based)

## Modify-this exercise

Write the naive `pow` with `x * my_pow(x, n - 1)`, count calls for n=30 (30), then count calls for the halving version (≈5). Write both call counts in a comment — feel the difference log makes.',
    'reading', 35, 11, true
  ),
  -- ── Lesson 12 ─────────────────────────────────────────────
  (
    v_l12, v_course_id,
    'Trees I: Traversal Is Everything',
    'DFS (three orders) and BFS (levels) — the two templates every tree problem is written in.',
    E'## What you''ll learn

90% of tree problems are one of two templates: **DFS** (recursion, three visit orders) or **BFS** (queue, level by level). Learn the templates once; recognise which one the problem wants.

## Concepts

- **DFS preorder** (node → left → right): copy/serialize a tree, path-from-root work
- **DFS inorder** (left → node → right): sorted order for a BST
- **DFS postorder** (left → right → node): children before parents — counting, height, bottom-up
- **BFS level order**: shortest depth, right-side view, everything "per level"
- Depth/height: `1 + max(depth(l), depth(r))` — a postorder fold

## Worked example

```python
from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))

# BFS level order — LC 102
q = deque([root])
levels = []
while q:
    level = []
    for _ in range(len(q)):        # freeze this level''s size
        node = q.popleft()
        level.append(node.val)
        if node.left:  q.append(node.left)
        if node.right: q.append(node.right)
    levels.append(level)
print(levels)   # [[3], [9, 20], [15, 7]]

# DFS height (postorder) — LC 104
def height(node):
    if not node:
        return 0
    return 1 + max(height(node.left), height(node.right))
print(height(root))   # 3
```

> **Ask:** why must the BFS inner loop use `range(len(q))` captured *before* popping?
>
> The queue is being modified inside the loop. Freezing `len(q)` makes the for-loop consume exactly the current level; whatever was appended during the round belongs to the next level. Without the freeze, levels bleed into each other.

## LeetCode reps

- LC 102 Level Order Traversal (medium) · LC 104 Maximum Depth (easy)
- LC 226 Invert Binary Tree (easy) · LC 199 Right Side View (medium)
- LC 100 Same Tree (easy) · LC 543 Diameter of Binary Tree (easy)

## Modify-this exercise

Modify the BFS to print only the **last** value of each level (that is the right-side view, LC 199). Run it: expected `3 20 7`.',
    'reading', 45, 12, true
  ),
  -- ── Lesson 13 ─────────────────────────────────────────────
  (
    v_l13, v_course_id,
    'Trees II: The Binary Search Tree Contract',
    'left < node < right — validate, search, insert, and find ancestors in O(h).',
    E'## What you''ll learn

A **BST** is a tree that promised: everything in the left subtree is smaller, everything in the right is larger. That promise turns O(n) scans into O(h) walks.

## Concepts

- Search/insert/delete: O(h), h = tree height (O(log n) if balanced, O(n) if degenerate)
- **Inorder traversal of a BST is sorted** — the single most useful BST fact
- **Validate**: pass down an allowed `(low, high)` range — do NOT just compare node with its children (that misses grandchildren violations)
- LCA in a BST: walk from the root; the split point (first node strictly between p and q) is the answer

## Worked example

```python
# Validate BST — LC 98
def is_valid(node, low=float("-inf"), high=float("inf")):
    if not node:
        return True
    if not (low < node.val < high):
        return False
    return is_valid(node.left, low, node.val) and \\
           is_valid(node.right, node.val, high)

# LCA in a BST — LC 235
def lca(root, p, q):
    node = root
    while node:
        if p < node.val and q < node.val:
            node = node.left      # both in left subtree
        elif p > node.val and q > node.val:
            node = node.right     # both in right subtree
        else:
            return node           # split point = LCA
```

> **Ask:** why does the `(low, high)` range fix the classic bug?
>
> Tree `[5, 1, 6, null, null, 3, 7]` — node 3 sits in the right subtree of 5. Comparing 3 with its parent 6 passes, but 3 < 5 violates the BST contract. Only the **range inherited from all ancestors** sees that violation.

## LeetCode reps

- LC 98 Validate BST (medium) · LC 235 LCA of a BST (medium)
- LC 230 Kth Smallest in a BST (medium — inorder, stop at k) · LC 701 Insert into a BST (medium)
- LC 108 Convert Sorted Array to BST (easy)

## Modify-this exercise

Using an inorder generator (`yield`), print the first 3 values of a BST in sorted order without traversing the whole tree. (That is LC 230 with early exit — O(h + k) instead of O(n).)',
    'reading', 40, 13, true
  ),
  -- ── Lesson 14 ─────────────────────────────────────────────
  (
    v_l14, v_course_id,
    'Heaps & Priority Queues: Keep the Best on Top',
    'heapq solves every top-k, k-th largest and k-way-merge problem — if you remember it is a min-heap.',
    E'## What you''ll learn

A **heap** keeps the *minimum* on top in O(1) and push/pop in O(log n) — without fully sorting. When a problem says "top k", "k-th largest", "merge k" or "repeatedly take the two smallest", it is a heap problem.

## Concepts

- Python `heapq` is a **min-heap**: `heapify`, `heappush`, `heappop` — all list-backed
- k-th largest = push n items, pop until size k, top of the size-k min-heap — O(n log k)
- Max-heap emulation: push **negated** values
- Push tuples `(priority, payload)` when you need custom ordering
- **Two heaps** trick: small max-heap + large min-heap = running median (LC 295)

## Worked example

```python
import heapq

# Kth largest in a stream — LC 703 style
nums, k = [3, 2, 1, 5, 6, 4], 2
heap = nums[:k]
heapq.heapify(heap)               # min-heap of the k largest so far
for x in nums[k:]:
    if x > heap[0]:
        heapq.heapreplace(heap, x)
print(heap[0])                    # 5 (2nd largest)

# Top K frequent — LC 347
from collections import Counter
counts = Counter([1, 1, 1, 2, 2, 3])
heap = [(-c, v) for v, c in counts.items()]
heapq.heapify(heap)
print(heapq.heappop(heap)[1], heapq.heappop(heap)[1])   # 1 2
```

> **Ask:** why keep a min-heap of size k instead of a max-heap of everything?
>
> With n = 10⁶ and k = 10: max-heap of all ⇒ n log n. Min-heap of size k ⇒ n log k, and memory stays O(k). In an interview, saying "I keep the heap bounded at k because I only evict the smallest of my current best" is the answer they are listening for.

## LeetCode reps

- LC 215 Kth Largest Element (medium) · LC 347 Top K Frequent (medium)
- LC 23 Merge k Sorted Lists (hard) · LC 295 Find Median from Data Stream (hard)
- LC 621 Task Scheduler (medium — greedy + heap)

## Modify-this exercise

Push `(-c, v)` tuples for LC 347. Predict: why does negating the count make the *most frequent* element pop first from a min-heap? Then print the top 1 for `[4,4,4,4,7,7,9]` (expect `4`).',
    'reading', 40, 14, true
  ),
  -- ── Lesson 15 ─────────────────────────────────────────────
  (
    v_l15, v_course_id,
    'Backtracking: Choose, Explore, Unchoose',
    'Systematically enumerate all candidates — and prune the branches that cannot win.',
    E'## What you''ll learn

**Backtracking** = DFS over the tree of decisions: at each step choose an option, recurse, then **undo** the choice. It powers subsets, permutations, combinations, N-Queens, Sudoku — anything asking for *all* candidates or *any* valid arrangement.

## Concepts

- The shape is always: `choose → explore → unchoose`
- Prune early: skip branches that already break the rules (sorted + break, or `continue`)
- Avoid duplicate work: subsets skip *behind* candidates (`start` index); permutations skip *used* ones (used-set)
- Complexity is output-sized: subsets 2ⁿ, permutations n! — fine only when n is small (≤ ~20)

## Worked example

```python
# Combination Sum — LC 39: all ways to reach target, reusing candidates
candidates, target = [2, 3, 6, 7], 7
candidates.sort()
results = []

def backtrack(start, remaining, path):
    if remaining == 0:
        results.append(path[:])       # copy — path keeps mutating
        return
    for i in range(start, len(candidates)):
        if candidates[i] > remaining:
            break                     # prune: sorted, nothing smaller ahead
        path.append(candidates[i])            # choose
        backtrack(i, remaining - candidates[i], path)  # i, not i+1: reuse allowed
        path.pop()                            # unchoose

backtrack(0, target, [])
print(results)   # [[2, 2, 3], [7]]
```

> **Ask:** why pass `i` for Combination Sum but `i + 1` for Subsets?
>
> `i` lets the same candidate be reused any number of times (LC 39). `i + 1` moves forward, so each element is used at most once (LC 78/40). One index — the entire difference between the two problem families.

## LeetCode reps

- LC 78 Subsets (medium) · LC 46 Permutations (medium)
- LC 39 Combination Sum (medium) · LC 40 Combination Sum II (medium — dedupe!) · LC 79 Word Search (medium)
- LC 51 N-Queens (hard)

## Modify-this exercise

Change Combination Sum to Combination Sum II semantics: each candidate usable **once** (`backtrack(i + 1, ...)`) with duplicates in input. Sort + skip equal neighbours (`if i > start and candidates[i] == candidates[i-1]: continue`) and verify `[2,5,2,1,2]`, target 5 gives `[[1,2,2], [5]]`.',
    'reading', 45, 15, true
  ),
  -- ── Lesson 16 ─────────────────────────────────────────────
  (
    v_l16, v_course_id,
    'Graphs I: A Grid Is a Graph',
    'Flood fill, connected components, and BFS shortest steps — matrices are graphs in disguise.',
    E'## What you''ll learn

Every matrix problem where you move up/down/left/right is a **graph** problem: cells are nodes, adjacencies are edges. Learn flood fill (DFS or BFS) once and Number of Islands, Flood Fill, Max Area of Island and friends all collapse to the same template.

## Concepts

- Represent graphs: adjacency list `graph[u].append(v)` for sparse, matrix for grids
- **Flood fill**: visit a cell, mark it visited, recurse/queue into its 4 neighbours
- Mark visited by *mutating the grid* (`"1" -> "0"`) to save memory
- BFS gives **shortest path in steps** on unweighted graphs; DFS only gives connectivity
- Direction vector: `for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):`

## Worked example

```python
# Number of Islands — LC 200
grid = [
    ["1", "1", "0", "0", "0"],
    ["1", "1", "0", "0", "0"],
    ["0", "0", "1", "0", "0"],
    ["0", "0", "0", "1", "1"],
]
rows, cols = len(grid), len(grid[0])

def sink(r, c):
    if 0 <= r < rows and 0 <= c < cols and grid[r][c] == "1":
        grid[r][c] = "0"            # mark visited by sinking the land
        sink(r + 1, c)
        sink(r - 1, c)
        sink(r, c + 1)
        sink(r, c - 1)
        return True
    return False

islands = 0
for r in range(rows):
    for c in range(cols):
        if sink(r, c):
            islands += 1
print(islands)   # 3
```

> **Ask:** why mutate the grid instead of keeping a `visited` set?
>
> It is the same algorithm — marking is what stops infinite recursion. Mutating uses O(1) extra memory; a visited set uses O(rows×cols). On LeetCode, mutating input is usually fine; in production code, prefer the set (or restore afterwards).

## LeetCode reps

- LC 200 Number of Islands (medium) · LC 733 Flood Fill (easy)
- LC 695 Max Area of Island (medium — return the component size) · LC 994 Rotting Oranges (medium — multi-source BFS)
- LC 130 Surrounded Regions (medium)

## Modify-this exercise

Change the counter to compute the **largest island area**: make `sink` return the component size (1 + the four recursive calls) and track the max. On the grid above the answer is 4.',
    'reading', 45, 16, true
  ),
  -- ── Lesson 17 ─────────────────────────────────────────────
  (
    v_l17, v_course_id,
    'Graphs II: Orders, Shortest Paths & Union-Find',
    'Topological sort for dependencies, Dijkstra for weights, and DSU for membership.',
    E'## What you''ll learn

Three advanced graph tools, each a fingerprint:

- **Topological sort** — "before/after" constraints ⇒ DAG + Kahn''s algorithm
- **Dijkstra** — weighted shortest path ⇒ min-heap of (distance, node)
- **Union-Find (DSU)** — grouping/merging questions ⇒ find with path compression

## Concepts

- Kahn: compute indegrees, seed the queue with 0-indegree nodes, pop → append to order → decrement neighbours; if the order is shorter than n, there is a **cycle**
- Dijkstra: pop the closest unvisited node, relax its edges; no negative weights allowed
- DSU: `find` (with path compression) + `union` (attach smaller root); count components by counting distinct roots

## Worked example

```python
from collections import deque

# Course Schedule — LC 207 (can you finish? = is the graph acyclic?)
num_courses = 4
prereqs = [[1, 0], [2, 1], [3, 2]]     # to take 1 you need 0, etc.
adj = [[] for _ in range(num_courses)]
indeg = [0] * num_courses
for course, need in prereqs:
    adj[need].append(course)
    indeg[course] += 1

q = deque(i for i in range(num_courses) if indeg[i] == 0)
seen = 0
while q:
    node = q.popleft()
    seen += 1
    for nxt in adj[node]:
        indeg[nxt] -= 1
        if indeg[nxt] == 0:
            q.append(nxt)
print(seen == num_courses)   # True
```

> **Ask:** with `prereqs = [[1, 0], [0, 1]]`, what does the loop produce?
>
> Both nodes start with indegree 1, the queue seeds empty, `seen = 0 != 2` → **False**. The cycle is detected not by searching for it, but by noticing the order came up short. Kahn''s is also the standard "is this dependency graph broken?" check.

## LeetCode reps

- LC 207 Course Schedule (medium) · LC 210 Course Schedule II (medium — output the order)
- LC 743 Network Delay Time (medium — Dijkstra) · LC 785 Is Graph Bipartite (medium — 2-colouring BFS)
- LC 547 Number of Provinces (medium — DSU) · LC 684 Redundant Connection (medium)

## Modify-this exercise

Change Course Schedule to Course Schedule II: collect popped nodes into an `order` list and return it when `seen == n` (else `[]`). Expected for the example: `[0, 1, 2, 3]`.',
    'reading', 45, 17, true
  ),
  -- ── Lesson 18 ─────────────────────────────────────────────
  (
    v_l18, v_course_id,
    'Dynamic Programming I: One Dimension',
    'Define the state, write the recurrence, memoize — then feel Kadane and LIS click.',
    E'## What you''ll learn

DP is **recursion + memory**: solve each distinct subproblem once. The craft is choosing the **state** — what does `dp[i]` *mean*? Get the meaning right; the code is three lines.

## Concepts

- **Top-down**: recursion + `@lru_cache`. **Bottom-up**: fill a table in dependency order
- Two DP questions to ask: (1) what is the state? (2) what choice do I make at each state?
- Kadane (max subarray): `dp[i] = max(nums[i], dp[i-1] + nums[i])` — "extend the run, or restart"
- House robber: `dp[i] = max(dp[i-1], dp[i-2] + nums[i])` — "skip this house, or rob it"
- LIS: `dp[i] = 1 + max(dp[j] for j < i if nums[j] < nums[i])` — O(n²), or O(n log n) with a patience array + bisect

## Worked example

```python
# Coin Change — LC 322: fewest coins to make amount
coins, amount = [1, 2, 5], 11
INF = amount + 1
dp = [0] + [INF] * amount
for a in range(1, amount + 1):
    for c in coins:
        if c <= a:
            dp[a] = min(dp[a], dp[a - c] + 1)
print(dp[amount] if dp[amount] < INF else -1)   # 3 (5 + 5 + 1)
```

> **Ask:** why is greedy "always take the biggest coin" wrong here?
>
> For `coins = [1, 3, 4]`, `amount = 6`: greedy takes 4 + 1 + 1 (3 coins), but 3 + 3 needs only 2. Greedy is correct only for *canonical* coin systems (like real currency). DP tries every last-coin choice and keeps the best — that is why the inner loop exists.

## LeetCode reps

- LC 70 Climbing Stairs (easy) · LC 198 House Robber (medium)
- LC 322 Coin Change (medium) · LC 300 Longest Increasing Subsequence (medium)
- LC 213 House Robber II (medium — run LC 198 twice: with and without the first house)

## Modify-this exercise

Space-optimize House Robber: keep only two variables `prev2, prev1` and roll them. The table disappears; complexity drops from O(n) space to **O(1)**. Verify `[2, 7, 9, 3, 1]` still yields 12.',
    'reading', 45, 18, true
  ),
  -- ── Lesson 19 ─────────────────────────────────────────────
  (
    v_l19, v_course_id,
    'Dynamic Programming II: Grids, Knapsacks & Strings',
    'Two-dimensional states: unique paths, coin change II, and the LCS family.',
    E'## What you''ll learn

When a state needs two coordinates — position **and** something else (capacity, second index) — the dp table goes 2-D. Three archetypes cover most of it: grid paths, knapsack counting, and string alignment.

## Concepts

- **Grid DP**: `dp[r][c] = dp[r-1][c] + dp[r][c-1]` — paths through an obstacle grid
- **0/1 knapsack counting** (Coin Change II): iterate coins in the OUTER loop so combinations are counted once, not permutations
- **LCS**: `dp[i][j] = dp[i-1][j-1] + 1` on a match, else `max(dp[i-1][j], dp[i][j-1])`
- Row-rolling: 2-D tables usually compress to one row — a favourite follow-up

## Worked example

```python
# Unique Paths — LC 62
m, n = 3, 7
dp = [[1] * n for _ in range(m)]     # first row/col: exactly 1 way
for r in range(1, m):
    for c in range(1, n):
        dp[r][c] = dp[r - 1][c] + dp[r][c - 1]
print(dp[m - 1][n - 1])   # 28

# Longest Common Subsequence — LC 1143
a, b = "abcde", "ace"
dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
for i in range(1, len(a) + 1):
    for j in range(1, len(b) + 1):
        if a[i - 1] == b[j - 1]:
            dp[i][j] = dp[i - 1][j - 1] + 1
        else:
            dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
print(dp[len(a)][len(b)])   # 3 ("ace")
```

> **Ask:** in Coin Change II, what breaks if the coin loop is INSIDE the amount loop?
>
> You count **permutations** (1+2 and 2+1 as different). Coins outer ⇒ each combination is built in one canonical coin order and counted exactly once. Loop order is not a detail in combinatorial DP — it is the answer.

## LeetCode reps

- LC 62 Unique Paths (medium) · LC 64 Minimum Path Sum (medium)
- LC 518 Coin Change II (medium) · LC 1143 LCS (medium) · LC 72 Edit Distance (medium/hard)
- LC 97 Interleaving String (medium)

## Modify-this exercise

Add obstacles (LC 63): a cell with an obstacle has `dp = 0`. Verify on `[[0,0,0],[0,1,0],[0,0,0]]` the answer is 2.',
    'reading', 45, 19, true
  ),
  -- ── Lesson 20 ─────────────────────────────────────────────
  (
    v_l20, v_course_id,
    'The Playbook: From Problem Statement to Pattern',
    'The recognition table, the decision checklist, and the 4-week grind plan.',
    E'## What you''ll learn

Knowing 19 templates is useless if you cannot pick the right one in 90 seconds. This lesson is the **map** — the entire course compressed into recognition triggers and a study plan.

## The recognition table

| The problem says… | Reach for… | Lesson |
|---|---|---|
| "find a pair/complement" · duplicate · frequency | Hash map / set | 2 |
| sorted input, or "pair with target sum" | Two pointers | 3 |
| **contiguous** subarray/substring with a max/min/constraint | Sliding window | 4 |
| range sums · subarray sum == k | Prefix sums (+ dict) | 5 |
| nearest greater/smaller · match/undo · nested | Stack | 6–7 |
| linked list rewiring · cycle · middle | Pointers on nodes | 8 |
| sorted, or "minimize the maximum / maximize the minimum" | Binary search (maybe on the answer) | 9 |
| intervals/meetings/scheduling | Sort + sweep | 10 |
| all subsets / permutations / combinations | Backtracking | 15 |
| matrix, 4-direction movement, regions | DFS/BFS flood fill | 16 |
| prerequisites/ordering | Topological sort | 17 |
| shortest path (weighted) | Dijkstra / BFS (unweighted) | 17 |
| grouping/merging, connected after merges | Union-Find | 17 |
| "top k" / "k-th largest" / "merge k" | Heap | 14 |
| "number of ways" / min/max over choices with overlapping subproblems | DP | 18–19 |
| trees: depth, views, validate, paths | DFS/BFS templates | 12–13 |
| a single pass with a running best | Kadane-style DP | 18 |

## The 10-minute checklist (do this on EVERY problem)

1. **Restate** the problem in one sentence, including input size (`n ≤ 10⁵`?)
2. Size hints: n ≤ 20 → exponential/backtracking OK · n ≤ 10³ → O(n²) OK · n ≤ 10⁵–10⁶ → need O(n) or O(n log n) · n ≥ 10⁸ or "answer space" → binary search or O(log)
3. Brute force first — write its complexity, then ask what work is **repeated**
4. The repeated work is what your structure caches: dict, window state, prefix sum, heap, dp table
5. Write the template skeleton BEFORE the details; edge cases last (empty, single, duplicates, extremes)
6. Dry-run on the given example, then on one adversarial case you invent

## The 4-week grind plan

- **Week 1** — foundations: Lessons 1–5 + LC 1, 217, 242, 125, 167, 643, 3, 560 (re-draw every solution''s complexity on paper)
- **Week 2** — linear structures: Lessons 6–10 + LC 20, 739, 206, 21, 141, 704, 34, 875, 56
- **Week 3** — recursion everywhere: Lessons 11–15 + LC 50, 102, 104, 98, 235, 215, 347, 78, 46, 39
- **Week 4** — graphs & DP: Lessons 16–20 + LC 200, 733, 994, 207, 210, 547, 70, 198, 322, 300, 62, 1143
- Then: one MEDIUM per day, rotating categories, for 6 weeks. Track patterns in a notebook: "saw X, thought Y, missed Z." The notebook is the real syllabus.

> **Ask:** what single habit separates people who finish 500 problems from people who pass interviews?
>
> After every solved problem they write **which pattern it was and what the trigger in the statement was**. 150 problems solved *with the map* beat 500 solved by memory. You now have the map — this course''s 18 challenges are the terrain to practise it on.

## Modify-this exercise

Take any 5 challenges below and write their recognition table row (statement trigger → pattern → lesson) BEFORE coding. Then solve. That is the exact loop of every serious interview prep plan.',
    'reading', 40, 20, true
  );

  -- 3. Challenges — all graded by REAL EXECUTION (python3 runs the code,
  --    stdout is compared to expected_output). Every problem is a canonical
  --    LeetCode question with the standard example as the fixed dataset, so
  --    students must implement the real algorithm — hardcoding the answer
  --    is caught by the anti-echo detector.
  INSERT INTO public.challenges (
    id, course_id, title, description, difficulty, challenge_type,
    coins_reward, sort_order, starter_code, expected_output, is_active
  ) VALUES
  (
    uuid_generate_v4(), v_course_id,
    'Two Sum, the O(n) way',
    E'LC 1 — Two Sum. The array nums and target are given. Print the two indices (smallest first), space-separated.\nYour solution must run in O(n) using a dict — a nested-loop rescan teaches you nothing here.',
    'easy', 'python', 15, 1,
    E'nums = [2, 7, 11, 15]
target = 9

# Print the two indices that add up to target, space-separated: "0 1"
',
    '0 1', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Valid parentheses',
    E'LC 20 — Valid Parentheses. The string s contains only brackets. Print True if every opener is closed by the matching closer in the right order, else False.\nUse a stack: push openers, pop-and-verify on closers.',
    'easy', 'python', 15, 2,
    E's = "([{}])"

# Print True or False
',
    'True', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Binary search: leftmost index',
    E'LC 704/34 — Binary Search. nums is sorted ascending and target is given. Print the LEFTMOST index of target, or -1 if absent.\nYour loop must run in O(log n) — no linear scans, no .index().',
    'easy', 'python', 15, 3,
    E'nums = [1, 3, 5, 5, 5, 7, 9]
target = 5

# Print the leftmost index of target (here: 2), or -1
',
    '2', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Reverse a linked list',
    E'LC 206 — Reverse Linked List. The list 1->2->3->4->5 is built for you with the ListNode class.\nReverse it IN PLACE (rewire next pointers, no list copying) and print the values of the reversed list, space-separated.',
    'easy', 'python', 15, 4,
    E'class ListNode:
    def __init__(self, val=0, nxt=None):
        self.val = val
        self.next = nxt

head = ListNode(1, ListNode(2, ListNode(3, ListNode(4, ListNode(5)))))

# Reverse head in place, then print its values space-separated: "5 4 3 2 1"
',
    '5 4 3 2 1', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Maximum subarray (Kadane)',
    E'LC 53 — Maximum Subarray. nums is given. Print the largest sum of any contiguous subarray.\nOne pass, running best: extend the current run or restart at this element.',
    'medium', 'python', 20, 5,
    E'nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]

# Print the maximum subarray sum (here: 6, from [4, -1, 2, 1])
',
    '6', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Longest substring without repeats',
    E'LC 3 — Longest Substring Without Repeating Characters. The string s is given.\nPrint the length of the longest substring with all-distinct characters. Sliding window with a last-seen dict — O(n).',
    'medium', 'python', 20, 6,
    E's = "abcabcbb"

# Print the length (here: 3, from "abc")
',
    '3', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Merge intervals',
    E'LC 56 — Merge Intervals. intervals is a list of [start, end] pairs.\nSort by start, merge all overlapping intervals, then print each merged interval on its own line as "start end".',
    'medium', 'python', 20, 7,
    E'intervals = [[1, 3], [2, 6], [8, 10], [15, 18]]

# Print, one per line:
# 1 6
# 8 10
# 15 18
',
    E'1 6\n8 10\n15 18', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Product of array except self',
    E'LC 238 — Product of Array Except Self. nums is given.\nPrint the answer array space-separated, where each entry is the product of every OTHER element. No division allowed — use prefix and suffix products.',
    'medium', 'python', 20, 8,
    E'nums = [1, 2, 3, 4]

# Print: 24 12 8 6
',
    '24 12 8 6', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Level order traversal',
    E'LC 102 — Binary Tree Level Order Traversal. The tree is built for you.\nBFS it and print the level values as nested Python lists: print(levels).',
    'medium', 'python', 20, 9,
    E'from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

root = TreeNode(3, TreeNode(9), TreeNode(20, TreeNode(15), TreeNode(7)))

# Print: [[3], [9, 20], [15, 7]]
',
    '[[3], [9, 20], [15, 7]]', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Top K frequent elements',
    E'LC 347 — Top K Frequent Elements. nums and k are given.\nPrint the k most frequent elements, space-separated, most frequent first.\nA heap of size k runs in O(n log k).',
    'medium', 'python', 20, 10,
    E'from collections import Counter
import heapq

nums = [1, 1, 1, 2, 2, 3]
k = 2

# Print: 1 2
',
    '1 2', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Number of islands',
    E'LC 200 — Number of Islands. The grid maps 1=land, 0=water; land is connected horizontally or vertically.\nCount the islands with flood fill (DFS or BFS) and print the count.',
    'medium', 'python', 20, 11,
    E'grid = [
    ["1", "1", "0", "0", "0"],
    ["1", "1", "0", "0", "0"],
    ["0", "0", "1", "0", "0"],
    ["0", "0", "0", "1", "1"],
]

# Print the number of islands (here: 3)
',
    '3', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Coin change (fewest coins)',
    E'LC 322 — Coin Change. coins and amount are given.\nPrint the fewest number of coins needed to make amount, or -1 if impossible.\nBottom-up DP: dp[a] = fewest coins for amount a. (Greedy fails: for [1, 3, 4] and 6, greedy gives 3 coins, optimal is 2.)',
    'medium', 'python', 20, 12,
    E'coins = [1, 2, 5]
amount = 11

# Print the fewest coins (here: 3, from 5 + 5 + 1)
',
    '3', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Climbing stairs',
    E'LC 70 — Climbing Stairs. You can climb 1 or 2 steps at a time.\nPrint the number of distinct ways to reach step n. (Fibonacci in disguise — dp[i] = dp[i-1] + dp[i-2].)',
    'easy', 'python', 15, 13,
    E'n = 10

# Print the number of ways to climb n stairs (here: 89)
',
    '89', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Course schedule',
    E'LC 207 — Course Schedule. num_courses and prereqs are given: [a, b] means you must take b before a.\nPrint True if all courses can be finished, else False.\nKahn''s algorithm: if the topological order is shorter than num_courses, there is a cycle.',
    'medium', 'python', 20, 14,
    E'from collections import deque

num_courses = 4
prereqs = [[1, 0], [2, 1], [3, 2]]

# Print True or False
',
    'True', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Longest increasing subsequence',
    E'LC 300 — Longest Increasing Subsequence. nums is given.\nPrint the length of the longest strictly increasing subsequence (elements keep their order, need not be adjacent).\nO(n^2) dp is accepted here; the O(n log n) patience method with bisect is the mastery version.',
    'hard', 'python', 25, 15,
    E'nums = [10, 9, 2, 5, 3, 7, 101, 18]

# Print the LIS length (here: 4, from [2, 3, 7, 101])
',
    '4', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Longest common subsequence',
    E'LC 1143 — Longest Common Subsequence. Two strings are given.\nPrint the length of their longest common subsequence.\n2-D DP: match extends the diagonal, mismatch takes the better of left/up.',
    'hard', 'python', 25, 16,
    E'a = "abcde"
b = "ace"

# Print the LCS length (here: 3, from "ace")
',
    '3', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Combination sum: count the ways',
    E'LC 39 — Combination Sum. candidates (distinct) and target are given; each candidate may be reused any number of times.\nBacktrack (choose, explore, unchoose), then print how many unique combinations sum to target.\nHere: [2, 2, 3] and [7] — print 2.',
    'medium', 'python', 20, 17,
    E'candidates = [2, 3, 6, 7]
target = 7

# Print the number of unique combinations that sum to target (here: 2)
',
    '2', true
  ),
  (
    uuid_generate_v4(), v_course_id,
    'Daily temperatures (monotonic stack)',
    E'LC 739 — Daily Temperatures. T is a list of daily temperatures.\nFor each day print how many days until a warmer one (0 if never), space-separated.\nMonotonic stack of indexes: O(n).',
    'medium', 'python', 20, 18,
    E'T = [73, 74, 75, 71, 69, 72, 76, 73]

# Print: 1 1 4 2 1 1 0 0
',
    '1 1 4 2 1 1 0 0', true
  );

  -- Sanity check: report what was created
  RAISE NOTICE 'DSA course seeded: % lessons, % challenges',
    (SELECT count(*) FROM public.lessons WHERE course_id = v_course_id),
    (SELECT count(*) FROM public.challenges WHERE course_id = v_course_id);
END $$;

-- ============================================================
-- 4. Quizzes — mid-course check + final pattern recognition.
--    Top-level statements: a DO $$ ... $$ body cannot contain another
--    $$ quote, so these must live OUTSIDE the block above.
--    Insert-if-missing: re-running the seed keeps existing attempts.
-- ============================================================
INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
    'DSA — Mid-Course Check: Complexity & Core Structures',
    'Lessons 1-10: Big-O, hashing, two pointers, sliding window, stacks, lists, binary search, intervals.',
    70, true
FROM public.courses c WHERE c.slug = 'dsa-leetcode-playbook'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.title = 'DSA — Mid-Course Check: Complexity & Core Structures');

  DO $$
  DECLARE qid UUID;
  BEGIN
    SELECT id INTO qid FROM public.quizzes
      WHERE title = 'DSA — Mid-Course Check: Complexity & Core Structures' LIMIT 1;
    IF qid IS NULL THEN RETURN; END IF;

    INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
    (uuid_generate_v4(), qid, 'An algorithm processes a sorted array of n elements by repeatedly halving the search range. Its time complexity is:',
      '[{"id":"a","text":"O(n)"},{"id":"b","text":"O(log n)"},{"id":"c","text":"O(n log n)"},{"id":"d","text":"O(1)"}]',
      'b', 1, 1),
    (uuid_generate_v4(), qid, 'Two Sum can be solved in O(n) instead of O(n^2) by:',
      '[{"id":"a","text":"Sorting the array and rescanning"},{"id":"b","text":"Storing seen values in a dict and looking up the complement"},{"id":"c","text":"Using a nested loop with early break"},{"id":"d","text":"Converting the array to a string"}]',
      'b', 2, 1),
    (uuid_generate_v4(), qid, 'A sliding-window solution never makes left or right move backwards. Its total cost is:',
      '[{"id":"a","text":"O(n^2), because of the nested while"},{"id":"b","text":"O(n log n)"},{"id":"c","text":"O(n) amortized - each index enters and leaves once"},{"id":"d","text":"O(1)"}]',
      'c', 3, 1),
    (uuid_generate_v4(), qid, 'You need the maximum sum of every contiguous subarray of a fixed size k. The best approach is:',
      '[{"id":"a","text":"A fresh sum for every window: O(n*k)"},{"id":"b","text":"Slide the window, adding the new element and subtracting the old: O(n)"},{"id":"c","text":"Sort the array first: O(n log n)"},{"id":"d","text":"Prefix sums of every pair: O(n^2)"}]',
      'b', 4, 1),
    (uuid_generate_v4(), qid, 'Which structure is the right fit for matching the MOST RECENT unclosed bracket?',
      '[{"id":"a","text":"Queue"},{"id":"b","text":"Stack"},{"id":"c","text":"Heap"},{"id":"d","text":"Linked list"}]',
      'b', 5, 1),
    (uuid_generate_v4(), qid, 'A monotonic stack keeps its elements:',
      '[{"id":"a","text":"In insertion order always"},{"id":"b","text":"In sorted order, popping anything that breaks it"},{"id":"c","text":"Randomized for speed"},{"id":"d","text":"Reversed every other push"}]',
      'b', 6, 1),
    (uuid_generate_v4(), qid, 'Reversing a singly linked list in place requires tracking at minimum:',
      '[{"id":"a","text":"prev, curr and the saved next pointer"},{"id":"b","text":"The full list copied to an array"},{"id":"c","text":"A hash map of positions"},{"id":"d","text":"Only the head and tail"}]',
      'a', 7, 1),
    (uuid_generate_v4(), qid, 'For finding the leftmost occurrence of a target in a sorted array, on a successful match you should:',
      '[{"id":"a","text":"Return immediately"},{"id":"b","text":"Continue searching the LEFT half (hi = mid)"},{"id":"c","text":"Restart the search from 0"},{"id":"d","text":"Switch to linear scan"}]',
      'b', 8, 1),
    (uuid_generate_v4(), qid, 'Two intervals [a, b] and [c, d], sorted by start, overlap when:',
      '[{"id":"a","text":"c <= b"},{"id":"b","text":"a <= d"},{"id":"c","text":"c < a"},{"id":"d","text":"b <= d"}]',
      'a', 9, 1),
    (uuid_generate_v4(), qid, 'Merging a later interval into the previous one must extend with max(ends) because:',
      '[{"id":"a","text":"The later interval may be fully contained in the previous one"},{"id":"b","text":"Sorting guarantees ends are ordered too"},{"id":"c","text":"max is faster than direct assignment"},{"id":"d","text":"It deduplicates the input"}]',
      'a', 10, 1);
  END $$;INSERT INTO public.quizzes (id, course_id, title, description, passing_score, is_published)
SELECT uuid_generate_v4(), c.id,
    'DSA — Final: Pattern Recognition Under Pressure',
    'Lessons 11-20: recursion, trees, heaps, backtracking, graphs, DP — and picking the right pattern fast.',
    70, true
FROM public.courses c WHERE c.slug = 'dsa-leetcode-playbook'
AND NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.title = 'DSA — Final: Pattern Recognition Under Pressure');

  DO $$
  DECLARE qid UUID;
  BEGIN
    SELECT id INTO qid FROM public.quizzes
      WHERE title = 'DSA — Final: Pattern Recognition Under Pressure' LIMIT 1;
    IF qid IS NULL THEN RETURN; END IF;

    INSERT INTO public.quiz_questions (id, quiz_id, question, options, correct_answer, sort_order, points) VALUES
    (uuid_generate_v4(), qid, 'A problem asks for ALL ways to partition a small set (n <= 20). The intended technique is:',
      '[{"id":"a","text":"Dynamic programming"},{"id":"b","text":"Backtracking / enumeration"},{"id":"c","text":"Binary search"},{"id":"d","text":"Union-Find"}]',
      'b', 1, 1),
    (uuid_generate_v4(), qid, 'In Combination Sum, passing i (not i+1) to the recursive call means:',
      '[{"id":"a","text":"Each candidate is used at most once"},{"id":"b","text":"The same candidate may be reused any number of times"},{"id":"c","text":"The recursion becomes iterative"},{"id":"d","text":"Duplicates in the input are skipped"}]',
      'b', 2, 1),
    (uuid_generate_v4(), qid, 'An inorder traversal of a valid BST visits the values:',
      '[{"id":"a","text":"Level by level"},{"id":"b","text":"In sorted order"},{"id":"c","text":"In insertion order"},{"id":"d","text":"In reverse sorted order"}]',
      'b', 3, 1),
    (uuid_generate_v4(), qid, 'Validating a BST by comparing each node only with its immediate children fails because:',
      '[{"id":"a","text":"It is O(n^2)"},{"id":"b","text":"A grandchild can violate an ancestor''s bound without breaking a parent-child pair"},{"id":"c","text":"Trees cannot be traversed recursively"},{"id":"d","text":"It only works on complete trees"}]',
      'b', 4, 1),
    (uuid_generate_v4(), qid, 'For "k-th largest element" in a large stream, the memory-optimal approach is:',
      '[{"id":"a","text":"A max-heap of all elements"},{"id":"b","text":"A min-heap capped at size k"},{"id":"c","text":"Sorting the stream"},{"id":"d","text":"A dict of counts"}]',
      'b', 5, 1),
    (uuid_generate_v4(), qid, 'Kahn''s topological sort detects a cycle when:',
      '[{"id":"a","text":"The queue grows too large"},{"id":"b","text":"The produced order is shorter than the number of nodes"},{"id":"c","text":"Any node has indegree 0"},{"id":"d","text":"An edge points backwards"}]',
      'b', 6, 1),
    (uuid_generate_v4(), qid, 'Flood fill on a grid (Number of Islands) marks visited cells so that:',
      '[{"id":"a","text":"The output is sorted"},{"id":"b","text":"The same cell is never processed twice - preventing infinite recursion"},{"id":"c","text":"The grid becomes rectangular"},{"id":"d","text":"BFS becomes faster than DFS"}]',
      'b', 7, 1),
    (uuid_generate_v4(), qid, 'The DP state dp[i] in House Robber means:',
      '[{"id":"a","text":"The best loot considering the first i houses"},{"id":"b","text":"The loot of house i"},{"id":"c","text":"The number of houses robbed so far"},{"id":"d","text":"The minimum loot possible"}]',
      'a', 8, 1),
    (uuid_generate_v4(), qid, 'In Coin Change II (count combinations), putting the coin loop OUTSIDE the amount loop ensures:',
      '[{"id":"a","text":"Faster runtime"},{"id":"b","text":"Combinations are counted once each, not as reordered permutations"},{"id":"c","text":"Negative amounts are impossible"},{"id":"d","text":"The table needs one row only"}]',
      'b', 9, 1),
    (uuid_generate_v4(), qid, 'Input n can be up to 10^5. Which complexity family is REQUIRED (roughly)?',
      '[{"id":"a","text":"O(n^2)"},{"id":"b","text":"O(2^n)"},{"id":"c","text":"O(n log n) or better"},{"id":"d","text":"O(n^3)"}]',
      'c', 10, 1);
  END $$;

-- Final summary — counts everything by slug (top-level, after all inserts).
DO $$
BEGIN
  RAISE NOTICE 'DSA course final: % lessons, % challenges, % quizzes',
    (SELECT count(*) FROM public.lessons
      WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'dsa-leetcode-playbook')),
    (SELECT count(*) FROM public.challenges
      WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'dsa-leetcode-playbook')),
    (SELECT count(*) FROM public.quizzes
      WHERE course_id IN (SELECT id FROM public.courses WHERE slug = 'dsa-leetcode-playbook'));
END $$;
