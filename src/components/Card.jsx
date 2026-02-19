import { motion } from 'framer-motion';

function Card({ className = '', children, whileHover = { y: -6 }, ...rest }) {
  return (
    <motion.article className={`card ${className}`.trim()} whileHover={whileHover} {...rest}>
      {children}
    </motion.article>
  );
}

export default Card;
