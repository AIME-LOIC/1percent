import { motion } from 'framer-motion';
import { smoothScrollToHash } from '../utils/smoothScroll';

const footerLinks = [
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Services' },
  { href: '#projects', label: 'Projects' },
  { href: '#team', label: 'Team' },
  { href: '#contact', label: 'Contact' }
];

const serviceLinks = [
  { href: '#services', label: 'Web Development' },
  { href: '#services', label: 'Mobile Apps' },
  { href: '#services', label: 'AI Solutions' },
  { href: '#services', label: 'Cybersecurity' },
  { href: '#services', label: 'Blockchain' }
];

const resourceLinks = [
  { href: '#projects', label: 'Case Studies' },
  { href: '#projects', label: 'Portfolio' },
  { href: '#contact', label: 'Book a Call' },
  { href: '#contact', label: 'Support' },
  { href: '#about', label: 'Community' }
];

function Footer() {
  const handleLinkClick = (event, hash) => {
    event.preventDefault();
    smoothScrollToHash(hash);
  };

  return (
    <footer className="site-footer">
      <motion.div className="footer-grid" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }}>
        <div className="footer-brand">
          <div className="footer-logo">1%</div>
          <p>1% Digital Solutions builds secure web, mobile and AI products with practical business impact.</p>
        </div>

        <div className="footer-columns">
          <div className="footer-links">
            <h4>Quick Links</h4>
            <ul>
              {footerLinks.map((link) => (
                <li key={link.href + link.label}>
                  <a href={link.href} onClick={(event) => handleLinkClick(event, link.href)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-links">
            <h4>Services</h4>
            <ul>
              {serviceLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} onClick={(event) => handleLinkClick(event, link.href)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-links">
            <h4>Resources</h4>
            <ul>
              {resourceLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} onClick={(event) => handleLinkClick(event, link.href)}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-contact">
          <h4>Connect</h4>
          <p>Kigali, Rwanda</p>
          <p>hello@onepercent.rw</p>
          <div className="footer-socials">
            <a href="#" aria-label="Facebook">
              <i className="fa-brands fa-facebook-f"></i>
            </a>
            <a href="#" aria-label="Twitter">
              <i className="fa-brands fa-twitter"></i>
            </a>
            <a href="#" aria-label="LinkedIn">
              <i className="fa-brands fa-linkedin-in"></i>
            </a>
            <a href="#" aria-label="Instagram">
              <i className="fa-brands fa-instagram"></i>
            </a>
          </div>
        </div>
      </motion.div>

      <div className="footer-bottom">
        <p>&copy; 2026 1% Digital Solutions. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
