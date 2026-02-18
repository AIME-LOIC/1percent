import { motion, useReducedMotion } from 'framer-motion';

function SectionReveal({ as = 'section', className = '', id, children }) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] || motion.section;

  return (
    <MotionTag
      id={id}
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      {children}
    </MotionTag>
  );
}

export default SectionReveal;
