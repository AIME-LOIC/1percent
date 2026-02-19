import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import ToastContainer from './components/ToastContainer';
import HomePage from './pages/HomePage';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const storedTheme = localStorage.getItem('theme-mode');
    return storedTheme ? storedTheme === 'dark' : true;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    document.body.classList.remove('dark-mode', 'light-mode');
    document.body.classList.add(isDarkMode ? 'dark-mode' : 'light-mode');
    localStorage.setItem('theme-mode', isDarkMode ? 'dark' : 'light');
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
  }, [isDarkMode, isMenuOpen]);

  useEffect(() => {
    const hideTimer = setTimeout(() => setLoaderVisible(false), 1300);
    return () => clearTimeout(hideTimer);
  }, []);

  const showToast = useCallback((type = 'info', message = '', duration = 3600) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { id, type, message, duration }]);
  }, []);

  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      showToast('info', 'Welcome to 1% Digital Solutions!', 2800);
    }, 950);
    return () => clearTimeout(welcomeTimer);
  }, [showToast]);

  const handleThemeToggle = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      showToast('info', next ? 'Switched to dark mode' : 'Switched to light mode', 1700);
      return next;
    });
  };

  const handleDismissToast = (id) => setToasts((prev) => prev.filter((toast) => toast.id !== id));
  const handleMenuToggle = () => setIsMenuOpen((prev) => !prev);
  const handleCloseMenu = () => setIsMenuOpen(false);

  const handleContactSubmit = async (formValues, resetForm, setSubmittingLabel) => {
    try {
      setSubmittingLabel('Sending...');
      const formData = new FormData();
      formData.append('name', formValues.name);
      formData.append('_replyto', formValues._replyto);
      formData.append('message', formValues.message);

      const response = await fetch('https://formspree.io/f/xjkpopzz', {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' }
      });

      if (response.ok) {
        showToast('success', 'Message sent successfully!', 3000);
        resetForm();
      } else {
        showToast('error', 'Failed to send message. Please try again.', 3000);
      }
    } catch {
      showToast('error', 'An error occurred. Please try again.', 3000);
    } finally {
      setSubmittingLabel('Send Holiday Message');
    }
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <AnimatePresence>
        {loaderVisible && (
          <motion.div
            id="loader"
            role="status"
            aria-live="polite"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span>1%</span>
            <div className="loader-circle" aria-hidden="true"></div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        id="theme-toggle"
        aria-label="Toggle theme"
        aria-pressed={isDarkMode}
        title="Toggle theme"
        type="button"
        onClick={handleThemeToggle}
      >
        <i className={isDarkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} aria-hidden="true"></i>
      </button>

      <Navbar
        isDarkMode={isDarkMode}
        isMenuOpen={isMenuOpen}
        onThemeToggle={handleThemeToggle}
        onMenuToggle={handleMenuToggle}
        onLinkClick={handleCloseMenu}
      />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.33 }}>
        <HomePage isDarkMode={isDarkMode} onContactSubmit={handleContactSubmit} />
      </motion.div>

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </>
  );
}

export default App;
