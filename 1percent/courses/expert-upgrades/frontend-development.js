/* ============================================================
   Expert Layer data — Frontend Development
   Grounded in: perceived-performance practice, WCAG as legal
   baseline (EAA 2025), list virtualisation, state-machine thinking,
   Real User Monitoring.
   ============================================================ */
module.exports = {
  expertsDoDifferently: `Beginners ask "does it look right on my machine?" Experts ask three harder questions: **"How fast does it *feel*?"** (a 1.9s load that paints content immediately feels faster than a 1.5s load that shows a spinner), **"Can everyone use it?"** (accessibility is not a feature, it is the legal baseline — the European Accessibility Act enforced from mid-2025 makes WCAG conformance a requirement for many products, and it is simply correct engineering everywhere), and **"What happens when it fails?"** (offline, slow 3G, expired token, empty data, 10,000 rows — the states tutorials never draw).`,

  howExpertsWork: `They hold UI to a simple discipline: **derive, don't duplicate** — if "cart total" can be computed from items, it is not state, it is a calculation; every duplicated value is a future desync bug. Server data lives in a cache (React Query/SWR) with loading/error states per query; *UI* state (open dropdowns, current tab) lives locally; the URL holds anything a user should be able to share or refresh (filters, page, selected row). They build the empty, loading, and error states *before* the happy path, and treat a component that takes 10 props as a smell — 10 props is usually two components wearing one trench coat.`,

  toolsOfTheTrade: [
    ['Lighthouse + DevTools throttling', 'Audits and "Slow 4G" simulation', 'Performance is measured, not guessed; experts test on the user\'s network, not theirs'],
    ['React Query / SWR', 'Server-state caching with loading/error/refetch handling', 'Deletes 80% of hand-rolled state code and its bugs'],
    ['ARIA + keyboard pass', 'Semantic HTML first, ARIA only to fill gaps; unplug the mouse and tab the page', 'The fastest accessibility audit is a keyboard and a clear head'],
    ['List virtualisation', 'Render only visible rows (react-window/virtua) for long lists', 'The difference between a 10,000-row table that flies and one that freezes the phone'],
    ['Error boundaries + Sentry', 'Catching render crashes and reporting them with stack + user context', 'Users see a retry button instead of a white screen; you see the crash in minutes']
  ],

  insiderMoves: [
    'Set explicit width/height (or aspect-ratio) on every image and reserve skeleton space for lists — cumulative layout shift is the cheap, huge win: the page stops jumping as it loads.',
    'Debounce search inputs (250-300ms) and abort stale fetches with AbortController — the classic "results arrive out of order" bug disappears.',
    'Optimistic updates for small actions (like/save): update the UI immediately, roll back on failure with a toast. Perceived speed doubles without touching the backend.',
    'Use content-visibility: auto on below-the-fold sections — the one-line lazy render most teams never ship.',
    'Put anything shareable in the URL (?page=3&sort=price). Users share links; a UI state that survives refresh is a feature, one that dies is a bug.',
    'Test with the keyboard only: Tab through the whole page. If focus disappears, a modal trap is broken or a custom control is not focusable — that is a real user locked out.'
  ],

  fieldScenarios: [
    {
      situation: 'The app "works" but users complain it feels slow.',
      beginner: 'Adds more spinners and blames the server.',
      expert: 'Measures with real-user metrics: LCP (is the main content visible fast?), INP (does it respond to taps under 200ms?), CLS (does the layout jump?). Paints content progressively, inlines critical CSS, defers the 200KB analytics script — feels twice as fast with zero backend change.',
      why: 'Perceived performance is a frontend lever; waiting on the backend is giving away control.'
    },
    {
      situation: 'A screen renders 5,000 rows and the phone freezes.',
      beginner: 'Adds "please use a laptop" to the README.',
      expert: 'Virtualises the list (renders ~20 visible rows regardless of data size), paginates the API, and adds a performance test to CI so the regression is caught before the user with 5,000 rows finds it.',
      why: 'Real data is big data; the demo dataset lied.'
    },
    {
      situation: 'A modal closes and keyboard focus is lost to the page behind.',
      beginner: 'Never notices; mouse users are fine.',
      expert: 'Moves focus into the modal on open, traps Tab inside it, and restores focus to the trigger on close — 20 lines that decide whether a blind or motor-impaired user can use the product at all.',
      why: 'Accessibility bugs are silent until someone disabled depends on the product.'
    }
  ],

  expertMistakes: [
    'Reaching for useState for everything — including server data. That is how duplicate caches, race conditions, and "stale after save" bugs are born; cache libraries exist precisely for this.',
    'Div soup and div buttons. A <button> gets focus, keyboard activation, and screen-reader semantics for free; a <div onClick> gets none and needs ARIA to half-work. Semantic HTML is the cheapest performance and a11y feature there is.',
    'Optimising before measuring. Lighthouse before hunches: the biggest win is usually an uncompressed 800KB hero image, not the React.memo everyone reaches for.',
    'Shipping a form without handling *offline submit* — on flaky mobile networks, the queue-and-retry pattern (save to localStorage, sync later) is the difference between a trusted app and a lost customer.'
  ],

  dayInTheLife: `A frontend engineer starts with Sentry: three new crashes overnight, all on the checkout page for users on Android 9. They add an error boundary around checkout (so users see "retry" instead of white screen), then reproduce on a throttled connection and find the real bug — an unguarded optional chain on an old API shape. Mid-morning, a new feature: they build loading/empty/error states first, get design sign-off on those states (not just the happy one), then build the happy path. After lunch is a perf pass: Lighthouse says LCP 3.1s; the 900KB unoptimised hero image becomes a 90KB WebP with explicit dimensions, and CLS drops to near zero. They finish by tab-testing the new modal, restoring focus, and filing two a11y tickets they found on themselves.`,

  hiringLens: `Frontend interviews increasingly test the states, not the happy path: "Build a searchable list" — the senior candidate asks "what do you want to show while loading? when empty? on error? what about 10,000 results?" and that question alone signals experience. Accessibility questions ("how would a keyboard-only user close your modal?") and Core Web Vitals vocabulary (LCP/INP/CLS and their thresholds) are now standard screens at product companies. Portfolios with a performance or a11y case study ("I cut LCP from 4s to 1.6s") outperform portfolios with five clone apps.`,

  firstJobReality: `Your first tickets will be CSS alignment and a dropdown bug — and how you handle them is the interview. The seniors' tell: you open DevTools on a real phone (or the device emulator *with CPU throttling*), you check the empty state, and you ask which browsers/devices are actually supported *before* fixing. Within a month you will be handed the "list page is slow" ticket; virtualisation plus a paginated endpoint is the answer that gets your name mentioned in the next standup for the right reasons.`,

  exercises: [
    'Audit one page you built with a keyboard only (no mouse). Fix every place focus is lost or a control is unreachable. Time before/after to complete the page without the mouse.',
    'Run Lighthouse on mobile throttling against your app and fix the top three findings (usually: image sizes, script deferral, layout shift). Record the before/after LCP and CLS numbers.',
    'Take a list component and add all four states: loading skeletons, empty with a call to action, error with retry, and success. Then virtualise it and test with 10,000 fake rows.',
    'Add an offline queue to one form: on submit failure, save to localStorage, show a pending indicator, retry on reconnect. You have just built the feature that wins users on African mobile networks.'
  ],

  goDeeper: [
    'web.dev (Google) — Core Web Vitals thresholds and fixes, straight from the source; the "Learn Performance" course is free.',
    'MDN Accessibility guide + WebAIM\'s WCAG checklist — the practical, legal-baseline reference.',
    'TanStack Query docs — read "Queries" and "Mutations" end to end; it is a masterclass in server-state thinking.',
    '"Refactoring UI" (Wathan & Schoger) — the design details that separate amateur-looking UIs from professional ones, without needing to be a designer.'
  ],

  onePercent: `experts optimise what users *feel* — instant feedback, no layout jumps, real content painted fast — and they build the loading, empty, error, and offline states before the happy path, because that is where the product actually lives.`
};
