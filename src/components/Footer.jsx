import { motion } from 'framer-motion';

function Footer() {
  return (
    <footer>
      <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        &copy; 2026 1% Digital Solutions
      </motion.p>
      <p>
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
      </p>
    </footer>
  );
}

export default Footer;
