import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { smoothScrollToHash } from '../utils/smoothScroll';

const links = [
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Services' },
  { href: '#projects', label: 'Projects' },
  { href: '#team', label: 'Team' },
  { href: '#contact', label: 'Contact' }
];

function Navbar({ isDarkMode, isMenuOpen, onMenuToggle, onThemeToggle, onLinkClick }) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [activeHash, setActiveHash] = useState(() => {
    const hashes = links.map((link) => link.href);
    return hashes.includes(window.location.hash) ? window.location.hash : '#about';
  });

  const focusableSelector = useMemo(
    () => 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    []
  );

  const handleLinkClick = (event, href) => {
    event.preventDefault();
    setActiveHash(href);
    smoothScrollToHash(href, onLinkClick);
  };

  useEffect(() => {
    const sections = links
      .map((link) => document.querySelector(link.href))
      .filter((section) => section instanceof HTMLElement);

    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries[0]?.target?.id) {
          setActiveHash(`#${visibleEntries[0].target.id}`);
        }
      },
      {
        rootMargin: '-32% 0px -52% 0px',
        threshold: [0.15, 0.35, 0.6]
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const previousActiveElement = document.activeElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onLinkClick();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = drawerRef.current?.querySelectorAll(focusableSelector);
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus();
      }
    };
  }, [focusableSelector, isMenuOpen, onLinkClick]);

  return (
    <>
      <nav role="navigation" aria-label="Main navigation">
        <div className="nav-left" style={{ border: 'none' }}>
          <div className="nav-logo">1%</div>
          <ul className="nav-links-desktop" id="nav-links" aria-hidden="false">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={activeHash === link.href ? 'active' : ''}
                  aria-current={activeHash === link.href ? 'page' : undefined}
                  onClick={(event) => handleLinkClick(event, link.href)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="nav-right">
          <button
            id="theme-toggle"
            aria-label="Toggle theme"
            aria-pressed={isDarkMode}
            title="Toggle theme"
            type="button"
            onClick={onThemeToggle}
          >
            <i className={isDarkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} aria-hidden="true"></i>
          </button>

          <button
            className="hamburger-btn"
            id="hamburger"
            aria-label="Toggle navigation"
            aria-controls="mobile-drawer"
            aria-expanded={isMenuOpen}
            type="button"
            onClick={onMenuToggle}
          >
            <i className={isMenuOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'} aria-hidden="true"></i>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.button
              type="button"
              className="drawer-backdrop"
              aria-label="Close navigation menu"
              onClick={onLinkClick}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.aside
              id="mobile-drawer"
              className="nav-drawer"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="drawer-header">
                <div className="nav-logo">1%</div>
                <button type="button" aria-label="Close menu" ref={closeButtonRef} onClick={onLinkClick}>
                  <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
              </div>

              <ul className="nav-links-mobile" aria-hidden="false">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className={activeHash === link.href ? 'active' : ''}
                      aria-current={activeHash === link.href ? 'page' : undefined}
                      onClick={(event) => handleLinkClick(event, link.href)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
