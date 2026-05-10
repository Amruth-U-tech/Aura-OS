/**
 * XPBar — Immersive Progression Bar (Phase B.2)
 *
 * Split into two motion layers to avoid the "duplicate animate prop" pitfall:
 * - Width layer: CSS transition drives the fill width (simplest, no layout jank)
 * - Glow layer: useAnimation controls drive the boxShadow pulse independently
 * This separation keeps both animations running cleanly at the same time.
 *
 * XP popup queue: tracks a list of popups keyed by id so rapid completions
 * show sequential popups rather than collapsing into a single update.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useXPSystem } from '../hooks/useXPSystem';
import { EventBus, EventTypes } from '../events/eventBus';
import {
  xpPopupVariants,
  xpBarGlowVariants,
  levelUpVariants,
  levelUpShimmerVariants,
  xpCounterVariants,
} from '../animations/xpAnimations';

export default function XPBar() {
  const { xp, level, xpPercentage, showLevelUp } = useXPSystem();
  const glowControls  = useAnimation();
  const [popups, setPopups] = useState([]);
  const popupIdRef    = useRef(0);
  const prevXpRef     = useRef(xp);

  // When XP increases: fire glow pulse + queue a popup
  useEffect(() => {
    const gained = xp - prevXpRef.current;
    if (gained > 0) {
      // Glow pulse — uses useAnimation so it never conflicts with width animation
      glowControls.start('pulse').then(() => glowControls.start('idle'));

      // Queue popup with unique id
      const id = ++popupIdRef.current;
      setPopups(prev => [...prev, { id, amount: gained }]);
      setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 900);
    }
    prevXpRef.current = xp;
  }, [xp, glowControls]);

  return (
    <div className="xp-bar-container">

      {/* Header row */}
      <div className="xp-bar-header">
        <span className="xp-label">Level {level}</span>

        {/* XP counter — fades through on value change */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={xp}
            className="xp-value"
            variants={xpCounterVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {xp} XP
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Track */}
      <div className="xp-track">
        {/*
          WIDTH via CSS transition on inline style — simplest approach,
          zero conflict with the glow animate prop below.
          The spring-like easing is declared directly on the style transition.
        */}
        <motion.div
          className="xp-fill"
          style={{
            width: `${xpPercentage * 100}%`,
            transition: 'width 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          variants={xpBarGlowVariants}
          initial="idle"
          animate={glowControls}
        />

        {/* Level-up shimmer sweep — absolutely positioned over the track */}
        <AnimatePresence>
          {showLevelUp && (
            <motion.div
              key="shimmer"
              className="xp-shimmer"
              variants={levelUpShimmerVariants}
              initial="hidden"
              animate="visible"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Floating "+XP" popups */}
      <div className="xp-popup-anchor" aria-hidden="true">
        <AnimatePresence>
          {popups.map(p => (
            <motion.span
              key={p.id}
              className="xp-popup"
              variants={xpPopupVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              +{p.amount} XP
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Level-up badge */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            key="level-badge"
            className="level-up-badge"
            variants={levelUpVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            ⚡ Level {level} Reached
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
