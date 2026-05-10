/**
 * FocusOverlay — Immersive Focus Mode Overlay (Phase B.2)
 * Layered vignette, frosted backdrop, and elegant content reveal.
 */
import { motion } from 'framer-motion';
import { overlayVariants, focusContentVariants } from '../animations/auraTransitions';

export default function FocusOverlay({ onExit }) {
  return (
    <motion.div
      className="focus-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Layered vignette: radial center-clear + edge darkness */}
      <div className="focus-vignette" />
      <div className="focus-vignette-edge" />

      {/* Subtle animated background shimmer — very low opacity */}
      <motion.div
        className="focus-shimmer-bg"
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="focus-content"
        variants={focusContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className="focus-icon"
          animate={{ scale: [1, 1.07, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          ◉
        </motion.div>
        <h2 className="focus-title">Focus Mode</h2>
        <p className="focus-subtitle">Distractions minimized. You are locked in.</p>

        <motion.button
          className="focus-exit-btn"
          onClick={onExit}
          whileHover={{ scale: 1.03, borderColor: 'var(--primary)' }}
          whileTap={{ scale: 0.97 }}
        >
          Exit Focus
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
