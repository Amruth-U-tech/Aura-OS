/**
 * Aura Transition Variants — Phase B.2 (Visual Polish)
 *
 * Governs all overlay, companion, and mode-shift animations.
 * All transforms are GPU-composited (opacity + transform only).
 */

/** Full-screen overlay fade — FocusOverlay, modals */
export const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.45, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.35, ease: 'easeIn' } },
};

/** Content inside focus overlay — delayed reveal after backdrop */
export const focusContentVariants = {
  hidden:  { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0, y: -12, scale: 0.98,
    transition: { duration: 0.3 },
  },
};

/** Companion bubble — spring pop with soft elastic overshoot */
export const bubbleVariants = {
  hidden:  { opacity: 0, scale: 0.82, y: 10 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 22 },
  },
  exit: {
    opacity: 0, scale: 0.92, y: 6,
    transition: { duration: 0.22, ease: 'easeIn' },
  },
};

/**
 * Aura status pulse — continuous gentle scale oscillation.
 * Signals the system is "alive" without demanding attention.
 */
export const auraPulseVariants = {
  idle:  { scale: 1 },
  pulse: {
    scale: [1, 1.18, 1],
    transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
  },
};

/** Companion breathing glow — opacity oscillation on the avatar icon */
export const companionBreathVariants = {
  idle: { opacity: 0.7 },
  breathe: {
    opacity: [0.7, 1, 0.7],
    scale:   [1,   1.08, 1],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
};

/** Dim non-essential UI during focus mode */
export const dimVariants = {
  normal: { opacity: 1,   transition: { duration: 0.4 } },
  dimmed: { opacity: 0.28, transition: { duration: 0.4 } },
};

/** Task card hover lift — keeps interaction feeling snappy */
export const cardHoverVariants = {
  rest: {
    y: 0,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.12)',
    borderColor: 'var(--border)',
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  hover: {
    y: -3,
    boxShadow: '0 12px 28px -4px rgba(0,0,0,0.28), 0 0 0 1px rgba(139,92,246,0.15)',
    borderColor: 'rgba(139,92,246,0.4)',
    transition: { duration: 0.22, ease: 'easeOut' },
  },
};

/** Stat card entrance stagger */
export const statCardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
};

/** Button hover sweep energy */
export const buttonTapVariants = {
  tap: { scale: 0.96, transition: { duration: 0.1 } },
};
