/* ============================================================
   Toast Notification System
   ============================================================
   Usage:
     Toast.success('Enrolled!')         — green, auto-dismiss 3s
     Toast.error('Limit reached')       — red, auto-dismiss 5s
     Toast.info('New feature available') — blue, auto-dismiss 3s
     Toast.warning('Almost at limit')   — yellow, auto-dismiss 4s
   ============================================================ */

const Toast = {
  container: null,

  _init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:360px;';
    document.body.appendChild(this.container);
  },

  _show(message, type = 'info', duration = 3000) {
    this._init();

    const svgIcons = {
      success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>',
      error:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
      warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
      info:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'
    };
    const colors = {
      success: { bg: '#ecfdf5', border: '#059669', text: '#065f46', icon: svgIcons.success },
      error:   { bg: '#fef2f2', border: '#dc2626', text: '#991b1b', icon: svgIcons.error },
      warning: { bg: '#fffbeb', border: '#d97706', text: '#92400e', icon: svgIcons.warning },
      info:    { bg: '#eff6ff', border: '#2563eb', text: '#1e40af', icon: svgIcons.info }
    };
    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.style.cssText = `
      pointer-events:auto;display:flex;align-items:flex-start;gap:10px;
      padding:14px 16px;border-radius:10px;background:${c.bg};
      border-left:4px solid ${c.border};color:${c.text};
      font-size:13px;line-height:1.4;box-shadow:0 4px 12px rgba(0,0,0,.12);
      transform:translateX(120%);transition:transform .3s ease,opacity .3s ease;
      font-family:var(--font);cursor:pointer;max-width:360px;
    `;
    toast.innerHTML = `
      <span style="font-size:16px;font-weight:700;flex-shrink:0;margin-top:-1px;">${c.icon}</span>
      <span style="flex:1;">${message}</span>
      <span style="flex-shrink:0;cursor:pointer;opacity:.5;" onclick="this.parentElement.remove()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></span>
    `;

    toast.addEventListener('click', () => toast.remove());
    this.container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; });

    // Auto dismiss
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg, duration) { this._show(msg, 'success', duration); },
  error(msg, duration)   { this._show(msg, 'error', duration || 5000); },
  warning(msg, duration) { this._show(msg, 'warning', duration || 4000); },
  info(msg, duration)    { this._show(msg, 'info', duration); }
};

window.Toast = Toast;
