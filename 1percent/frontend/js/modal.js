/* ============================================================
   Modal System
   ============================================================
   Handles opening/closing modals via data attributes or JS API.
   ============================================================ */

const Modal = {
  /**
   * Open a modal by ID
   */
  open(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  },

  /**
   * Close a modal by ID
   */
  close(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  },

  /**
   * Close all open modals
   */
  closeAll() {
    document.querySelectorAll('.modal-overlay.show').forEach(m => {
      m.classList.remove('show');
    });
    document.body.style.overflow = '';
  },

  /**
   * Initialize modal event listeners
   */
  init() {
    // data-modal attribute — click to open
    document.querySelectorAll('[data-modal]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.open(el.dataset.modal);
      });
    });

    // data-close-modal attribute — click to close
    document.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', () => {
        const modal = el.closest('.modal-overlay');
        if (modal) {
          modal.classList.remove('show');
          document.body.style.overflow = '';
        }
      });
    });

    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('show');
          document.body.style.overflow = '';
        }
      });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAll();
    });
  }
};

// Make globally accessible
window.Modal = Modal;
