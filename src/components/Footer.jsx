import { motion } from 'framer-motion';
import { smoothScrollToHash } from '../utils/smoothScroll';

const footerLinks = [
  { href: '#friday', label: 'Friday' },
  { href: '#projects', label: 'Projects' },
  { href: '#services', label: 'Services' },
  { href: '#team', label: 'Collaborators' },
  { href: '#contact', label: 'Contact' }
];

function Footer() {
  const handleLinkClick = (event, hash) => {
    event.preventDefault();
    smoothScrollToHash(hash);
  };

  return (
    <footer className="site-footer">
      <motion.div
        className="footer-grid"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
      >
        <div className="footer-brand">
          <div className="footer-logo">1%</div>
          <p>1% Digital Solutions presents Friday as the flagship AI product and keeps the rest of the work visible.</p>
        </div>

        <div className="footer-links">
          <h4>Navigate</h4>
          <ul>
            {footerLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={(event) => handleLinkClick(event, link.href)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-contact">
          <h4>Connect</h4>
          <p>Kigali, Rwanda</p>
          <p>
            <a href="mailto:hello@onepercent.rw">hello@onepercent.rw</a>
          </p>
          <p className="footer-note">AI powered by 1percent universal AI, trained by 1percent.</p>
        </div>
      </motion.div>

      <div className="footer-bottom">
        <p>&copy; 2026 1% Digital Solutions. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
