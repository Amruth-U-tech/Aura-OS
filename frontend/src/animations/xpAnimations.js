/**
 * XP Animation Variants — Phase B.2 (Visual Polish)
 *
 * All variants use only transform and opacity — GPU-composited properties.
 * WHY: Animating layout properties (width, height, top) forces layout recalculation
 *      every frame. transform/opacity run entirely on the compositor thread,
 *      keeping the main thread free for React reconciliation.
 */

/** Floating "+XP" popup that rises and fades above the bar */
export const xpPopupVariants = {
  hidden:  { opacity: 0, y: 0,   scale: 0.75 },
  visible: {
    opacity: 1, y: -28, scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0, y: -52, scale: 0.9,
    transition: { duration: 0.5, ease: 'easeIn' },
  },
};

/**
 * XP fill uses CSS width animation (driven by Framer motion animate prop),
 * not a variant, so we only expose the transition config here.
 */
export const xpFillTransition = {
  duration: 0.9,
  ease: [0.34, 1.56, 0.64, 1], // slight overshoot for "snap" feel
};

/** Glow pulse on the fill bar — fires once on XP gain */
export const xpBarGlowVariants = {
  idle: {
    boxShadow: '0 0 0px rgba(var(--aura-glow), 0)',
  },
  pulse: {
    boxShadow: [
      '0 0 0px  rgba(139,92,246,0)',
      '0 0 18px rgba(139,92,246,0.75)',
      '0 0 6px  rgba(139,92,246,0.35)',
      '0 0 0px  rgba(139,92,246,0)',
    ],
    transition: { duration: 1.1, times: [0, 0.3, 0.6, 1], ease: 'easeOut' },
  },
};

/** Level-up badge entrance — spring pop */
export const levelUpVariants = {
  hidden:  { opacity: 0, scale: 0.5, y: 12 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 18 },
  },
  exit: {
    opacity: 0, scale: 1.1, y: -8,
    transition: { duration: 0.4, ease: 'easeIn' },
  },
};

/**
 * Shimmer sweep across the XP bar track on level-up.
 * Implemented as a background-position animation on a
 * pseudo-element — but since we can't animate pseudo-elements with Framer Motion,
 * we animate an absolutely-positioned overlay div instead.
 */
export const levelUpShimmerVariants = {
  hidden:  { opacity: 0, x: '-110%' },
  visible: {
    opacity: [0, 0.6, 0],
    x: '110%',
    transition: { duration: 0.85, ease: 'easeInOut' },
  },
};

/** XP counter number — fade-through on change */
export const xpCounterVariants = {
  enter: { opacity: 0, y: -8 },
  center: {
    opacity: 1, y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0, y: 8,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};
