/* ============================================================
   Roadmap Module
   ============================================================
   Fetches the roadmap from the API and renders an interactive
   timeline with expandable phases, modules, and lessons.
   ============================================================ */

const Roadmap = {
  data: null,

  /**
   * Fetch roadmap from API
   */
  async fetch() {
    try {
      const res = await fetch('/api/roadmap');
      const json = await res.json();
      if (json.success) {
        this.data = json.roadmap;
        this.render();
      }
    } catch (err) {
      console.error('Roadmap fetch error:', err);
      document.getElementById('roadmap-container').innerHTML =
        '<div class="roadmap-loading">Could not load roadmap. Please try again later.</div>';
    }
  },

  /**
   * Render the full roadmap timeline
   */
  render() {
    const container = document.getElementById('roadmap-container');
    if (!this.data) return;

    container.innerHTML = `
      <div class="roadmap-stats" style="text-align:center;margin-bottom:32px;">
        <span style="font-family:var(--mono);font-size:13px;color:var(--text-muted);">
          ${this.data.total_lessons} lessons · ${this.data.total_duration_minutes} minutes · ${this.data.totalWeeks} weeks
        </span>
      </div>
    `;

    const phaseIcons = { foundation: 'rocket', fullstack: 'zap', specialisation: 'target', certification: 'trophy' };
    this.data.phases.forEach((phase, index) => {
      container.appendChild(this._createPhaseElement(phase, index, phaseIcons[phase.id] || 'book-open'));
    });
  },

  /**
   * Create a phase element
   */
  _createPhaseElement(phase, index, iconName) {
    const el = document.createElement('div');
    el.className = 'roadmap-phase';

    // Get modules — either from phase.modules or from tracks
    const modules = this._getPhaseModules(phase);

    el.innerHTML = `
      <div class="roadmap-phase-header">
        <div class="roadmap-phase-num" style="background:${phase.color}">${index + 1}</div>
        <div class="roadmap-phase-info">
          <h3>${Icons.get(iconName, 20)} ${escapeHTML(phase.title)}</h3>
          <p>${escapeHTML(phase.subtitle)} — ${escapeHTML(phase.duration_weeks)} weeks</p>
        </div>
        <span class="roadmap-phase-meta">${modules.length} modules</span>
        <span class="roadmap-phase-toggle">▼</span>
      </div>
      <div class="roadmap-phase-body"></div>
    `;

    const header = el.querySelector('.roadmap-phase-header');
    const body = el.querySelector('.roadmap-phase-body');

    header.addEventListener('click', () => {
      el.classList.toggle('open');
    });

    // Render modules
    modules.forEach(mod => {
      body.appendChild(this._createModuleElement(mod));
    });

    // Render tracks if present
    if (phase.tracks) {
      const tracksSection = document.createElement('div');
      tracksSection.style.marginTop = '16px';
      tracksSection.innerHTML = `<div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;font-family:var(--mono);">Expert Tracks</div>`;

      phase.tracks.forEach(track => {
        const trackEl = document.createElement('div');
        trackEl.style.cssText = 'background:var(--surface);border:1px solid var(--border-light);border-radius:var(--radius-md);padding:16px;margin-bottom:12px;';
        trackEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            ${Icons.get('code', 22)}
            <div>
              <div style="font-weight:700;font-size:15px;">${escapeHTML(track.title)}</div>
              <div style="font-size:12px;color:var(--text-muted);">Mentored by ${escapeHTML(track.mentor)}</div>
            </div>
          </div>
        `;

        track.modules.forEach(mod => {
          trackEl.appendChild(this._createModuleElement(mod));
        });

        tracksSection.appendChild(trackEl);
      });

      body.appendChild(tracksSection);
    }

    return el;
  },

  /**
   * Get modules from a phase (handles both flat modules and tracks)
   */
  _getPhaseModules(phase) {
    if (phase.modules) return phase.modules;
    // For track-based phases, collect all unique modules
    if (phase.tracks) {
      const allModules = [];
      phase.tracks.forEach(track => {
        track.modules.forEach(mod => {
          allModules.push({ ...mod, trackTitle: track.title });
        });
      });
      return allModules;
    }
    return [];
  },

  /**
   * Create a module element
   */
  _createModuleElement(mod) {
    const el = document.createElement('div');
    el.className = 'roadmap-module';

    const lessonCount = mod.lessons?.length || 0;
    const totalMin = mod.lessons?.reduce((sum, l) => sum + (l.duration_min || 0), 0) || 0;

    el.innerHTML = `
      <div class="roadmap-module-header">
        <h4>${escapeHTML(mod.title)}</h4>
        <span class="module-count">${lessonCount} lessons · ${totalMin} min</span>
        <span class="roadmap-phase-toggle" style="font-size:12px;">▼</span>
      </div>
      <div class="roadmap-lessons"></div>
    `;

    const header = el.querySelector('.roadmap-module-header');
    const lessonsContainer = el.querySelector('.roadmap-lessons');

    header.addEventListener('click', () => {
      el.classList.toggle('open');
    });

    // Render lessons
    if (mod.lessons) {
      mod.lessons.forEach(lesson => {
        const lessonEl = document.createElement('div');
        lessonEl.className = 'roadmap-lesson';
        lessonEl.innerHTML = `
          <span class="roadmap-lesson-type ${escapeHTML(lesson.type)}">${escapeHTML(lesson.type)}</span>
          <span class="roadmap-lesson-title">${escapeHTML(lesson.title)}</span>
          <span class="roadmap-lesson-duration">${escapeHTML(lesson.duration_min)} min</span>
        `;
        lessonsContainer.appendChild(lessonEl);
      });
    }

    return el;
  }
};

// Make globally accessible
window.Roadmap = Roadmap;
