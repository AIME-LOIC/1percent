import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';

function StatsStrip() {
  return (
    <section className="stats-strip" aria-label="Company statistics">
      <motion.div className="stat-item" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <h3>
          <AnimatedCounter value={5} suffix="+" />
        </h3>
        <p>project</p>
      </motion.div>
      <motion.div className="stat-item" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.08 }}>
        <h3>
          <AnimatedCounter value={5} />
        </h3>
        <p>Members</p>
      </motion.div>
      <motion.div className="stat-item" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.14 }}>
        <h3>
          <AnimatedCounter value={100} suffix="%" />
        </h3>
        <p>Unique</p>
      </motion.div>
    </section>
  );
}

export default StatsStrip;
