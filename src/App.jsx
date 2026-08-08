import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import BackToTopButton from './components/BackToTopButton';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const storedTheme = localStorage.getItem('theme-mode');
    return storedTheme ? storedTheme === 'dark' : false;
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(true);

  useEffect(() => {
    document.body.classList.remove('dark-mode', 'light-mode');
    document.body.classList.add(isDarkMode ? 'dark-mode' : 'light-mode');
    localStorage.setItem('theme-mode', isDarkMode ? 'dark' : 'light');
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
  }, [isDarkMode, isMenuOpen]);

  useEffect(() => {
    const hideTimer = setTimeout(() => setLoaderVisible(false), 1100);
    return () => clearTimeout(hideTimer);
  }, []);

  const handleThemeToggle = () => {
    setIsDarkMode((prev) => !prev);
  };

  const handleMenuToggle = () => setIsMenuOpen((prev) => !prev);
  const handleCloseMenu = () => setIsMenuOpen(false);

  const handleContactSubmit = async (formValues, resetForm) => {
    try {
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
        resetForm();
        return { ok: true };
      }

      return { ok: false, message: 'Failed to send message. Please try again.' };
    } catch {
      return { ok: false, message: 'An error occurred. Please try again.' };
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
            transition={{ duration: 0.45 }}
          >
            <span>1%</span>
            <div className="loader-copy">
              <p>1percent Digital Solutions</p>
              <strong>Building Friday and the wider portfolio.</strong>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar
        isDarkMode={isDarkMode}
        isMenuOpen={isMenuOpen}
        onMenuToggle={handleMenuToggle}
        onThemeToggle={handleThemeToggle}
        onLinkClick={handleCloseMenu}
      />

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        <HomePage isDarkMode={isDarkMode} onContactSubmit={handleContactSubmit} />
      </motion.div>

      <BackToTopButton />
    </>
  );
}

export default App;
