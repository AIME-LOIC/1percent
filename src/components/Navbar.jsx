import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { smoothScrollToHash } from '../utils/smoothScroll';

const links = [
  { href: '#friday', label: 'Friday' },
  { href: '#services', label: 'Services' },
  { href: '#projects', label: 'Projects' },
  { href: '#team', label: 'Collaborators' },
  { href: '#contact', label: 'Contact' }
];

function Navbar({ isDarkMode, isMenuOpen, onMenuToggle, onThemeToggle, onLinkClick }) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [activeHash, setActiveHash] = useState(() => {
    const hashes = links.map((link) => link.href);
    return hashes.includes(window.location.hash) ? window.location.hash : '#friday';
  });

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
        rootMargin: '-30% 0px -55% 0px',
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

      const focusableElements = drawerRef.current?.querySelectorAll('a[href], button:not([disabled])');
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
  }, [isMenuOpen, onLinkClick]);

  const handleLinkClick = (event, href) => {
    event.preventDefault();
    setActiveHash(href);
    smoothScrollToHash(href, onLinkClick);
  };

  return (
    <>
      <nav className="nav-shell" role="navigation" aria-label="Main navigation">
        <a className="nav-logo" href="#friday" onClick={(event) => handleLinkClick(event, '#friday')}>
          1%
        </a>

        <ul className="nav-links-desktop" aria-hidden="false">
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
