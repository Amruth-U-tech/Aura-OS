/**
 * AuraOverlay — Layered Ambient Glow (Phase B.2)
 * Multi-layer radial gradient creates depth without GPU cost.
 * Color is driven by the CSS variable --aura-glow set by ThemeProvider.
 */
import { motion } from 'framer-motion';
import { useThemeState } from '../state/AppStateContext';

const GLOW_CONFIG = {
  default:    { color: '139,92,246',  intensity: 0.07 },
  focus:      { color: '16,185,129',  intensity: 0.09 },
  discipline: { color: '245,158,11',  intensity: 0.07 },
  victory:    { color: '251,191,36',  intensity: 0.11 },
  burnout:    { color: '100,116,139', intensity: 0.04 },
};

export default function AuraOverlay() {
  const { state } = useThemeState();
  const cfg       = GLOW_CONFIG[state.theme] || GLOW_CONFIG.default;
  const rgba      = (a) => `rgba(${cfg.color}, ${a})`;

  return (
    <motion.div
      className="aura-overlay"
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4, ease: 'easeInOut' }}
      style={{
        /* Two-layer radial: top-center hero glow + subtle edge vignette */
        background: [
          `radial-gradient(ellipse 80% 40% at 50% 0%, ${rgba(cfg.intensity)} 0%, transparent 70%)`,
          `radial-gradient(ellipse 100% 30% at 50% 100%, ${rgba(cfg.intensity * 0.4)} 0%, transparent 60%)`,
        ].join(', '),
      }}
    />
  );
}
