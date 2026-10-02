/* ============================================================
   dev-activity.js — 14-day development activity heatmap (Phase 6)
   ============================================================
   GitHub-contribution-style grid, 1percent design system:
   4px base unit, 4 intensity levels, no fake data (Phase 35:
   empty days render as level 0, never labeled as failures).
   Data: /api/student/dev/activity/14d →
     [{date, commits, tasks, prs, reviews, tests, other, total}]

   Usage:
     <div id="activity-grid"></div>
     OPDevActivity.render('#activity-grid', days, { onCellClick });
   ============================================================ */

(function () {
  'use strict';

  const LEVEL_CLASS = ['lvl0', 'lvl1', 'lvl2', 'lvl3'];
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function maxTotal(days) {
    let max = 0;
    for (const d of days || []) if (d.total > max) max = d.total;
    return max;
  }

  function levelFor(day, max) {
    if (!day.total) return 0;
    const ratio = day.total / Math.max(max, 1);
    if (ratio > 0.66) return 3;
    if (ratio > 0.33) return 2;
    return 1;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /**
   * Render the 14-day grid.
   * @param {string|Element} selector container
   * @param {Array} days 14 buckets oldest-first
   * @param {object} opts { onCellClick(day) }
   */
  function render(selector, days, opts = {}) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;
    const list = Array.isArray(days) ? days : [];
    const max = maxTotal(list);

    el.classList.add('opdev-grid');
    el.innerHTML = list.map((day, i) => {
      const date = new Date(day.date + 'T00:00:00Z');
      const weekday = DAY_LABELS[date.getUTCDay()];
      const lvl = LEVEL_CLASS[levelFor(day, max)];
      const tip = [
        `<strong>${esc(date.toISOString().slice(0, 10))} (${weekday})</strong>`,
        `Development activity: <strong>${day.total}</strong>`,
        day.commits ? `Commits: ${day.commits}` : null,
        day.tasks ? `Tasks: ${day.tasks}` : null,
        day.prs ? `PRs: ${day.prs}` : null,
        day.reviews ? `Reviews: ${day.reviews}` : null,
        day.tests ? `Tests: ${day.tests}` : null
      ].filter(Boolean).join('<br>');

      return `<button type="button" class="opdev-cell ${lvl}" data-index="${i}"
        aria-label="${esc(date.toISOString().slice(0, 10))}: ${day.total} activities"
        data-tooltip="${esc(tip)}"></button>`;
    }).join('');

    // Click handling (delegated) — cells are buttons: keyboard accessible.
    el.onclick = (e) => {
      const cell = e.target.closest('.opdev-cell');
      if (cell && opts.onCellClick) opts.onCellClick(list[Number(cell.dataset.index)]);
    };
  }

  window.OPDevActivity = { render };
})();
