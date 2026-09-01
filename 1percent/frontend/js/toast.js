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

    const colors = {
      success: { bg: '#ecfdf5', border: '#059669', text: '#065f46', icon: '✓' },
      error:   { bg: '#fef2f2', border: '#dc2626', text: '#991b1b', icon: '✕' },
      warning: { bg: '#fffbeb', border: '#d97706', text: '#92400e', icon: '⚠' },
      info:    { bg: '#eff6ff', border: '#2563eb', text: '#1e40af', icon: 'ℹ' }
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
      <span style="font-size:14px;opacity:.5;cursor:pointer;flex-shrink:0;" onclick="this.parentElement.remove()">✕</span>
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
