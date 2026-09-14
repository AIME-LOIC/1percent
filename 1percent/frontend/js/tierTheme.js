/* ============================================================
   Tier Theme — gives each membership tier its own look.
   ============================================================
   SOURCE OF TRUTH (important):
   The tier is resolved from the BACKEND SESSION payload —
   GET /api/auth/me → user.tier / user.is_premium /
   user.subscription_status (populated from user_subscriptions
   by authService.getProfile). It is NEVER read from
   localStorage or URL params, so a paid look can never be
   faked client-side or shown on an unpaid session.

   Theme classes are toggled on <html>:
     html.theme-free     → default green look
     html.theme-premium  → active paid subscription (Pro/Pro+)
   Styles live in css/tier-theme.css (per-slug accents) and
   css/premium-theme.css (paid dashboard theme).

   Usage (any app page):
     <script src="/js/tierTheme.js" defer></script>
     TierTheme.init(token).then(theme => {
       theme.slug          // 'free' | 'starter' | 'pro' | 'unlimited'
       theme.label         // 'Free Starter' | 'Pro' | ...
       theme.isPaid        // true for pro/unlimited
     });
     // After a payment succeeds:
     await TierTheme.sessionRefresh(token); // re-fetches session, re-applies
   ============================================================ */

(function () {
  'use strict';

  /* Paid tiers → theme-premium. Everything else → theme-free. */
  const PAID_TIERS = new Set(['pro', 'unlimited']);

  const TIERS = {
    free:      { slug: 'free',      label: 'Free Starter', badgeClass: 'free',      isPaid: false },
    starter:   { slug: 'starter',   label: 'Starter',      badgeClass: 'free',      isPaid: false },
    pro:       { slug: 'pro',       label: 'Pro',          badgeClass: 'pro',       isPaid: true  },
    unlimited: { slug: 'unlimited', label: 'Pro+',         badgeClass: 'unlimited', isPaid: true  }
  };

  let current = null;

  function normalizeSlug(raw) {
    const slug = String(raw || 'free').toLowerCase();
    if (TIERS[slug]) return slug;
    if (PAID_TIERS.has(slug)) return slug; // custom paid tier slugs keep their label
    return 'free';
  }

  function themeClass(slug) {
    return PAID_TIERS.has(slug) ? 'theme-premium' : 'theme-free';
  }

  /**
   * Apply the theme class to <html> (with the fade defined in
   * premium-theme.css, the switch animates instead of flashing).
   * Also mirrors the slug on <body> as tier-free/tier-pro/tier-unlimited
   * for the legacy per-slug accents in css/tier-theme.css.
   */
  function apply(slug) {
    slug = normalizeSlug(slug);
    const meta = TIERS[slug] || { slug, label: slug, badgeClass: 'free', isPaid: PAID_TIERS.has(slug) };

    // New theme classes on <html> (dashboard premium theme)
    const root = document.documentElement;
    root.classList.remove('theme-free', 'theme-premium');
    root.classList.add(themeClass(slug));
    root.dataset.tier = slug; // introspection/debugging only

    // Legacy slug classes on <body> (tier-theme.css on course/playground)
    const body = document.body;
    if (body) {
      body.classList.remove('tier-free', 'tier-pro', 'tier-unlimited');
      body.classList.add('tier-' + (TIERS[slug] ? slug : 'free'));
    }

    current = meta;
    document.dispatchEvent(new CustomEvent('tiertheme', { detail: meta }));
    return meta;
  }

  /**
   * Resolve the tier from the backend session — the single source of truth.
   * 1) GET /api/auth/me            → user.tier / is_premium / subscription_status
   * 2) fallback GET /api/premium/status → tier.slug (same DB logic)
   */
  async function fetchTierFromSession(token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const json = await res.json();
        const user = json?.user;
        if (user) {
          const tier = String(user.tier || 'free').toLowerCase();
          if (tier !== 'free' && user.is_premium === true) return tier;
          if (tier !== 'free' && user.subscription_status === 'active') return tier;
          if (user.is_premium === false || tier === 'free') return 'free';
        }
      }
    } catch { /* fall through to the premium status endpoint */ }

    try {
      const res = await fetch('/api/premium/status', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json.tier?.slug) return json.tier.slug;
      }
    } catch { /* stay free */ }

    return 'free';
  }

  const TierTheme = {
    /**
     * Fetch the tier from the session payload and apply the theme.
     * Call on every dashboard load — persistence comes from the DB
     * (user_subscriptions), not from any client-side flag.
     */
    async init(token) {
      const slug = await fetchTierFromSession(token);
      return apply(slug);
    },

    /**
     * Payment-success path: re-fetch the session AFTER the subscription
     * row was written (webhook/subscribe handler) and only then apply the
     * theme. Never toggled directly from the payment event itself.
     */
    async sessionRefresh(token) {
      const slug = await fetchTierFromSession(token);
      return apply(slug);
    },

    /** Apply a known slug (pages that already fetched /premium/status). */
    applySlug(slug) { return apply(slug); },

    /** Current tier info (null before init). */
    get current() { return current; },

    /** Badge HTML for the current or a given tier slug. */
    badgeHTML(slug) {
      const meta = slug ? (TIERS[normalizeSlug(slug)] || { label: slug, badgeClass: 'free' }) : (current || TIERS.free);
      return `<span class="membership-badge tier-badge ${meta.badgeClass}">${meta.label}</span>`;
    }
  };

  window.TierTheme = TierTheme;
})();
