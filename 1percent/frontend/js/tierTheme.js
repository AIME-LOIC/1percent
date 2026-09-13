/* ============================================================
   Tier Theme — gives each membership tier its own look.
   ============================================================
   - Free (Starter): the classic green look — unchanged.
   - Pro: a fresh violet/indigo look, similar structure.
   - Unlimited (Pro+): a gold/black premium look.

   Usage (any app page):
     <script src="/js/tierTheme.js" defer></script>
     TierTheme.init(tokenOrClient).then(theme => {
       theme.slug          // 'free' | 'pro' | 'unlimited' | custom
       theme.label         // 'Free Starter' | 'Pro' | ...
       theme.badgeClass    // 'free' | 'pro' | 'unlimited'
       theme.isPaid
     });

   The theme is applied by adding `tier-free` / `tier-pro` /
   `tier-unlimited` to <body>. Styles live in css/tier-theme.css.
   ============================================================ */

(function () {
  'use strict';

  const TIERS = {
    free:      { slug: 'free',      label: 'Free Starter', badgeClass: 'free',      isPaid: false },
    starter:   { slug: 'starter',   label: 'Starter',      badgeClass: 'free',      isPaid: false },
    pro:       { slug: 'pro',       label: 'Pro',          badgeClass: 'pro',       isPaid: true  },
    unlimited: { slug: 'unlimited', label: 'Pro+',         badgeClass: 'unlimited', isPaid: true  }
  };

  let current = null;

  async function fetchStatus(token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch('/api/premium/status', { headers });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (!json.success || !json.tier) throw new Error('No tier data');
    return json.tier;
  }

  function apply(slug) {
    const meta = TIERS[slug] || { slug, label: slug, badgeClass: 'free', isPaid: slug !== 'free' };
    document.body.classList.remove('tier-free', 'tier-pro', 'tier-unlimited');
    document.body.classList.add('tier-' + (TIERS[slug] ? slug : 'free'));
    current = meta;
    document.dispatchEvent(new CustomEvent('tiertheme', { detail: meta }));
    return meta;
  }

  const TierTheme = {
    /** Fetch status + apply body theme. token optional (endpoint works without auth → free). */
    async init(token) {
      try {
        const tier = await fetchStatus(token);
        return apply(tier.slug);
      } catch {
        return apply('free');
      }
    },

    /** Apply without fetching (e.g. tier already known from another call). */
    applySlug(slug) { return apply(slug); },

    /** Current tier info (null before init). */
    get current() { return current; },

    /** Badge HTML for the current or a given tier slug. */
    badgeHTML(slug) {
      const meta = slug ? (TIERS[slug] || { label: slug, badgeClass: 'free' }) : (current || TIERS.free);
      return `<span class="membership-badge tier-badge ${meta.badgeClass}">${meta.label}</span>`;
    }
  };

  window.TierTheme = TierTheme;
})();
