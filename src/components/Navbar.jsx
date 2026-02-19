import { AnimatePresence, motion } from 'framer-motion';
import { smoothScrollToHash } from '../utils/smoothScroll';

const links = [
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Services' },
  { href: '#projects', label: 'Projects' },
  { href: '#team', label: 'Team' },
  { href: '#contact', label: 'Contact' }
];

function Navbar({ isDarkMode, isMenuOpen, onThemeToggle, onMenuToggle, onLinkClick }) {
  const handleLinkClick = (event, href) => {
    event.preventDefault();
    smoothScrollToHash(href, onLinkClick);
  };

  return (
    <>
      <nav role="navigation" aria-label="Main navigation">
        <div className="nav-left" style={{ border: 'none' }}>
          <div className="nav-logo">1%</div>
          <ul className="nav-links-desktop" id="nav-links" aria-hidden="false">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={(event) => handleLinkClick(event, link.href)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="nav-theme-toggle" aria-hidden="false">
          <button
            id="nav-theme-toggle"
            aria-label="Toggle theme (desktop)"
            aria-pressed={isDarkMode}
            type="button"
            onClick={onThemeToggle}
          >
            <i className={isDarkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} aria-hidden="true"></i>
          </button>
        </div>

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
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="drawer-header">
                <div className="nav-logo">1%</div>
                <button type="button" aria-label="Close menu" onClick={onLinkClick}>
                  <i className="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
              </div>

              <ul className="nav-links-mobile" aria-hidden="false">
                {links.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} onClick={(event) => handleLinkClick(event, link.href)}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>

              <button className="drawer-theme-btn" type="button" onClick={onThemeToggle}>
                <i className={isDarkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} aria-hidden="true"></i>
                Toggle Theme
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
