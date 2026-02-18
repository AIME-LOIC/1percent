import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import StatsStrip from './components/StatsStrip';
import AboutSection from './components/AboutSection';
import ServicesSection from './components/ServicesSection';
import ProjectsSection from './components/ProjectsSection';
import TeamSection from './components/TeamSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import ToastContainer from './components/ToastContainer';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [loaderFading, setLoaderFading] = useState(false);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    document.body.classList.remove('dark-mode', 'light-mode');
    document.body.classList.add(isDarkMode ? 'dark-mode' : 'light-mode');
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
  }, [isDarkMode, isMenuOpen]);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setLoaderFading(true), 900);
    const hideTimer = setTimeout(() => setLoaderVisible(false), 1450);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    const welcomeTimer = setTimeout(() => {
      showToast('info', 'Welcome to 1% Digital Solutions!', 3000);
    }, 1200);
    return () => clearTimeout(welcomeTimer);
  }, []);

  const showToast = (type = 'info', message = '', timeout = 4000) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, timeout);
    return () => clearTimeout(timeoutId);
  };

  const handleThemeToggle = () => {
    setIsDarkMode((prev) => {
      const nextModeIsDark = !prev;
      showToast('info', nextModeIsDark ? 'Switched to dark mode' : 'Switched to light mode', 1800);
      return nextModeIsDark;
    });
  };

  const handleMenuToggle = () => setIsMenuOpen((prev) => !prev);
  const handleCloseMenu = () => setIsMenuOpen(false);
  const handleDismissToast = (id) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

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

      {loaderVisible && (
        <div id="loader" role="status" aria-live="polite" style={{ opacity: loaderFading ? 0 : 1 }}>
          <span>1%</span>
          <div className="loader-circle" aria-hidden="true"></div>
        </div>
      )}

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

      <Hero isDarkMode={isDarkMode} />
      <StatsStrip />

      <main className="main-content" id="main" tabIndex="-1">
        <AboutSection />
        <ServicesSection />
        <ProjectsSection />
        <TeamSection />
        <ContactSection onSubmit={handleContactSubmit} />
      </main>

      <Footer />

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </>
  );
}

export default App;
