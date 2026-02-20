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
        <div className="hero-copy">
          <p className="hero-kicker">Digital Innovation Studio</p>
          <h1>Build Modern Products With Real-World Impact</h1>
          <p>
            We design and deliver secure, high-performance digital products for startups, institutions and growing
            teams.
          </p>
          <div className="hero-data">
            <span>5+ project</span>
            <span>5 members</span>
            <span>100% unique</span>
          </div>

          <div className="hero-cta">
            <a href="#contact" className="btn btn-primary" role="button" onClick={(event) => handleCtaClick(event, '#contact')}>
              Start a Project
            </a>
            <a href="#projects" className="btn btn-secondary" role="button" onClick={(event) => handleCtaClick(event, '#projects')}>
              Explore Work
            </a>
          </div>
        </div>
      </motion.div>
    </header>
  );
}

export default Hero;
