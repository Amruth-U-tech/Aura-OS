/**
 * AuraStatus — Animated Mode Indicator (Phase B.2)
 * Pulse dot is continuous when in non-standard mode.
 * Added mode label slide-in on change.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeState, useModeState } from '../state/AppStateContext';
import { auraPulseVariants } from '../animations/auraTransitions';

const MODE_CONFIG = {
  standard:   { label: 'Aura OS',     color: '#8b5cf6', icon: '◎' },
  discipline: { label: 'Focus Mode',  color: '#10b981', icon: '◉' },
};

export default function AuraStatus() {
  const { state: themeState } = useThemeState();
  const { state: modeState }  = useModeState();
  const config = MODE_CONFIG[modeState.mode] || MODE_CONFIG.standard;

  return (
    <div className="aura-status">
      <motion.div
        className="aura-status-dot"
        style={{ backgroundColor: config.color }}
        variants={auraPulseVariants}
        animate={modeState.mode !== 'standard' ? 'pulse' : 'idle'}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={modeState.mode}
          className="aura-status-text"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.25 } }}
          exit={{ opacity: 0, x: 6, transition: { duration: 0.18 } }}
        >
          <span className="aura-mode-label">{config.icon} {config.label}</span>
          <span className="aura-theme-label">{themeState.theme} theme</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
