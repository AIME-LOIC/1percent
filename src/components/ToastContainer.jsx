import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

function ToastItem({ toast, index, onDismiss }) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration || 3200);
    return () => clearTimeout(timer);
  }, [onDismiss, paused, toast.duration, toast.id]);

  const iconForType = (type) => {
    if (type === 'success') return 'fa-solid fa-check';
    if (type === 'error') return 'fa-solid fa-triangle-exclamation';
    return 'fa-solid fa-info';
  };

  return (
    <motion.div
      layout
      className={`toast ${toast.type || 'info'}`}
      onClick={() => onDismiss(toast.id)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 42, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      style={{ zIndex: 100 - index }}
    >
      <div className="icon">
        <i className={iconForType(toast.type)} aria-hidden="true"></i>
      </div>
      <div>{toast.message}</div>
      <motion.div
        className="toast-progress"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: paused ? 1 : 0 }}
        transition={{ duration: (toast.duration || 3200) / 1000, ease: 'linear' }}
      />
    </motion.div>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div id="toast-container" aria-live="polite" aria-atomic="true">
      <AnimatePresence initial={false}>
        {toasts
          .slice()
          .reverse()
          .map((toast, index) => (
            <ToastItem toast={toast} index={index} key={toast.id} onDismiss={onDismiss} />
          ))}
      </AnimatePresence>
    </div>
  );
}

export default ToastContainer;
