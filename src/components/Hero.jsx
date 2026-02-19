import { motion } from 'framer-motion';
import { smoothScrollToHash } from '../utils/smoothScroll';
import ThreeHeroBackground from './ThreeHeroBackground';

function Hero({ isDarkMode }) {
  const handleCtaClick = (event, hash) => {
    event.preventDefault();
    smoothScrollToHash(hash);
  };

  return (
    <header>
      <ThreeHeroBackground isDarkMode={isDarkMode} />
      <div className="hero-gradient" aria-hidden="true"></div>

      <motion.div
        className="hero-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <p className="hero-kicker">Digital Innovation Studio</p>
        <h1>1% Digital Solutions</h1>
        <p>We're crafting innovative digital solutions for the everyone.</p>
        <div className="hero-data">5+ project | 5 Members | 100% Unique</div>

        <div className="hero-cta">
          <a href="#contact" className="btn btn-primary" role="button" onClick={(event) => handleCtaClick(event, '#contact')}>
            Get Started
          </a>
          <a href="#projects" className="btn btn-secondary" role="button" onClick={(event) => handleCtaClick(event, '#projects')}>
            View Projects
          </a>
        </div>
      </motion.div>
    </header>
  );
}

export default Hero;
