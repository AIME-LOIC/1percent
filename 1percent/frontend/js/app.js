/* ============================================================
   App — Main Entry Point
   ============================================================
   Initializes all modules, binds global events, and boots
   the application.
   ============================================================ */

/**
 * Escape a string for safe insertion into innerHTML.
 * Anything rendered from the API (services, roadmap, courses) must go
 * through this before being placed in a template literal — otherwise a
 * compromised or malicious API response can inject a script.
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
window.escapeHTML = escapeHTML;

const App = {
  /**
   * Initialize the application
   */
  async init() {
    console.log('🚀 1% Digital Solutions — Loading...');

    // Initialize modules
    Modal.init();
    CookieConsent.init();
    await Auth.init();

    // Bind global events
    this._bindHeader();
    this._bindMobileNav();
    this._bindSmoothScroll();

    // Load dynamic content
    await Promise.all([
      this._loadServices()
    ]);

    console.log('✅ App loaded');
  },

  /**
   * Header scroll effect
   */
  _bindHeader() {
    const header = document.getElementById('header');
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  },

  /**
   * Mobile navigation toggle
   */
  _bindMobileNav() {
    const toggle = document.getElementById('mobile-toggle');
    const nav = document.getElementById('main-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => nav.classList.toggle('open'));
    }
  },

  /**
   * Smooth scroll for anchor links
   */
  _bindSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#') return;

        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          document.getElementById('main-nav')?.classList.remove('open');
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  },

  /**
   * Load and render services from API (fallback to static)
   */
  async _loadServices() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;

    try {
      const res = await fetch('/api/contact/services');
      const json = await res.json();

      if (json.success && json.services?.length > 0) {
        const serviceIcons = {
          'web-development': 'globe', 'mobile-apps': 'smartphone',
          'ai-automation': 'brain', 'cybersecurity': 'shield',
          'iot-embedded': 'plug', 'ui-ux-design': 'palette'
        };
        grid.innerHTML = json.services.map(s => `
          <div class="service-card">
            <div class="service-icon">${Icons.get(serviceIcons[s.slug] || 'rocket', 22)}</div>
            <h3>${escapeHTML(s.title)}</h3>
            <p>${escapeHTML(s.description)}</p>
            <div class="service-features">
              ${(s.features || []).map(f => `<span>${escapeHTML(f)}</span>`).join('')}
            </div>
          </div>
        `).join('');
        return;
      }
    } catch {
      // API not available — render static fallback
    }

    // Static fallback services
    const fb = [
      { icon: 'globe', title: 'Web Development', desc: 'Full-stack web apps built with modern frameworks — React, Next.js, Node.js, PostgreSQL.', tags: ['React / Next.js','Node.js','PostgreSQL','REST & GraphQL'] },
      { icon: 'smartphone', title: 'Mobile Applications', desc: 'Cross-platform mobile apps for iOS and Android with offline-first architecture.', tags: ['React Native','Flutter','Push Notifications','App Store'] },
      { icon: 'brain', title: 'AI & Automation', desc: 'Intelligent agents, workflow automation, and ML pipelines built in-house.', tags: ['Custom AI Agents','NLP & Vision','Workflows','Data Pipelines'] },
      { icon: 'shield', title: 'Cybersecurity', desc: 'Offensive testing, hardening, and incident response for critical systems.', tags: ['Pen Testing','Auditing','Hardening','Incident Response'] },
      { icon: 'plug', title: 'IoT & Embedded', desc: 'Hardware-software integration with real devices, sensors, and digital twins.', tags: ['ESP32 / Arduino','Sensors','MQTT','Digital Twins'] },
      { icon: 'palette', title: 'UI/UX Design', desc: 'User research, wireframing, prototyping, and polished design systems.', tags: ['User Research','Prototypes','Design Systems','Figma'] },
    ];
    grid.innerHTML = fb.map(s => `
      <div class="service-card">
        <div class="service-icon">${Icons.get(s.icon, 22)}</div>
        <h3>${s.title}</h3>
        <p>${s.desc}</p>
        <div class="service-features">${s.tags.map(t => `<span>${t}</span>`).join('')}</div>
      </div>
    `).join('');
  },

  /**
   * Render static course cards
   */
  _loadCourses() {
    const grid = document.getElementById('courses-grid');
    if (!grid) return;

    const courses = [
      { icon: 'rocket', color: '#d1fae5,#a7f3d0', level: 'Beginner', title: 'Full-Stack Fundamentals', desc: 'Master HTML, CSS, JavaScript, Git, and the tools every developer needs to start building.', weeks: 6 },
      { icon: 'code', color: '#dbeafe,#bfdbfe', level: 'Intermediate', title: 'React & Modern Frontend', desc: 'Build production UIs with React, hooks, state management, and component design patterns.', weeks: 8 },
      { icon: 'terminal', color: '#fef3c7,#fde68a', level: 'Intermediate', title: 'Backend Engineering', desc: 'Node.js, Express, PostgreSQL, authentication, REST APIs, and production deployment.', weeks: 8 },
      { icon: 'brain', color: '#ede9fe,#ddd6fe', level: 'Advanced', title: 'AI for Developers', desc: 'Integrate LLMs, build agents, and ship AI-powered features in real applications.', weeks: 10 },
      { icon: 'shield', color: '#fee2e2,#fecaca', level: 'Intermediate', title: 'Cybersecurity Essentials', desc: 'Offensive and defensive security, pen testing, secure coding, and incident response.', weeks: 8 },
      { icon: 'cloud', color: '#e0e7ff,#c7d2fe', level: 'Advanced', title: 'DevOps & Cloud', desc: 'Docker, CI/CD, cloud deployment on AWS/GCP, monitoring, and infrastructure as code.', weeks: 8 },
    ];

    grid.innerHTML = courses.map(c => `
      <div class="course-card">
        <div class="course-thumb" style="background:linear-gradient(135deg,${c.color});">
          ${Icons.get(c.icon, 48)}
          <span class="course-level">${c.level}</span>
        </div>
        <div class="course-body">
          <h3>${c.title}</h3>
          <p>${c.desc}</p>
          <div class="course-meta">
            <span>${c.weeks} weeks</span>
            <a href="#" class="btn btn-primary btn-sm" onclick="Auth.isLoggedIn() ? null : (Modal.open('auth-modal'), false); return false;">Enroll</a>
          </div>
        </div>
      </div>
    `).join('');
  }
};

// Boot the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
