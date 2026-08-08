import { motion } from 'framer-motion';
import { smoothScrollToHash } from '../utils/smoothScroll';
import FridayDemo from './FridayDemo';

function Hero() {
  const handleCtaClick = (event, hash) => {
    event.preventDefault();
    smoothScrollToHash(hash);
  };

  return (
    <header className="hero-shell">
      <div className="hero-copy">
        <p className="hero-kicker">1% Digital Solutions</p>
        <h1>Premium AI products, led by Friday.</h1>
        <p className="hero-summary">
          Friday is our flagship personal AI assistant. It is presented here the way a serious product should be:
          clear, useful, and focused on the user experience.
        </p>

        <div className="hero-feature-list" aria-label="Friday features">
          <span>Chat</span>
          <span>Reminders</span>
          <span>Web search</span>
          <span>Smart-home control</span>
        </div>

        <div className="hero-cta">
          <a href="#friday" className="btn btn-primary" role="button" onClick={(event) => handleCtaClick(event, '#friday')}>
            Meet Friday
          </a>
          <a href="#projects" className="btn btn-secondary" role="button" onClick={(event) => handleCtaClick(event, '#projects')}>
            Other work
          </a>
        </div>
      </div>

      <FridayDemo />

      <motion.div
        className="hero-notes"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
      >
        <div>
          <span className="note-label">Brand</span>
          <strong>1percent universal AI</strong>
          <p>Built by 1percent for business-ready product delivery.</p>
        </div>
        <div>
          <span className="note-label">Approach</span>
          <strong>Professional, not flashy</strong>
          <p>Minimal layout, large type, and restrained motion.</p>
        </div>
      </motion.div>
    </header>
  );
}

export default Hero;
