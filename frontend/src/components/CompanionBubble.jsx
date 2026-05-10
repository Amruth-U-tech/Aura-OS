/**
 * CompanionBubble — Phase B.2 (Visual Polish)
 * Added breathing animation to the companion avatar icon.
 * All logic unchanged from Phase B.1.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventBus, EventTypes } from '../events/eventBus';
import { resolveCompanionContext, getCompanionMessage } from '../ai/behavioralResponses';
import { bubbleVariants, companionBreathVariants } from '../animations/auraTransitions';

const DISPLAY_MS  = 4500;
const COOLDOWN_MS = 7000;

export default function CompanionBubble() {
  const [message, setMessage]    = useState(null);
  const cooldownRef              = useRef(false);
  const displayTimerRef          = useRef(null);
  const cooldownTimerRef         = useRef(null);
  const lastMessageRef           = useRef(null);

  const showMessage = useCallback((msg, highPriority = false) => {
    if (!msg) return;
    if (!highPriority && cooldownRef.current) return;
    if (msg === lastMessageRef.current) return;

    if (displayTimerRef.current)  clearTimeout(displayTimerRef.current);
    if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);

    setMessage(msg);
    lastMessageRef.current = msg;
    cooldownRef.current    = true;

    displayTimerRef.current = setTimeout(() => {
      setMessage(null);
      displayTimerRef.current = null;
      cooldownTimerRef.current = setTimeout(() => {
        cooldownRef.current = false;
        cooldownTimerRef.current = null;
      }, Math.max(0, COOLDOWN_MS - DISPLAY_MS));
    }, DISPLAY_MS);
  }, []);

  useEffect(() => {
    const unsubCreate     = EventBus.on(EventTypes.TASK_CREATED, ({ task }) => {
      const context = resolveCompanionContext(task?.title, 'create');
      if (context) showMessage(getCompanionMessage(context));
    });
    const unsubComplete   = EventBus.on(EventTypes.TASK_COMPLETED, ({ task }) => {
      const context = resolveCompanionContext(task?.title, 'complete');
      if (context) showMessage(getCompanionMessage(context));
    });
    const unsubLevel      = EventBus.on(EventTypes.LEVEL_UP,             () => showMessage(getCompanionMessage('onLevelUp'),       true));
    const unsubFocusEnter = EventBus.on(EventTypes.FOCUS_MODE_ENTERED,   () => showMessage(getCompanionMessage('onFocusEnter'),    true));
    const unsubFocusExit  = EventBus.on(EventTypes.FOCUS_MODE_EXITED,    () => showMessage(getCompanionMessage('onFocusExit')));
    const unsubDisc       = EventBus.on(EventTypes.DISCIPLINE_MODE_ENTERED, () => showMessage(getCompanionMessage('onDisciplineEnter'), true));
    const unsubStreak     = EventBus.on(EventTypes.STREAK_UPDATED, ({ count }) => {
      if (count && count % 5 === 0) showMessage(getCompanionMessage('onStreak'));
    });

    return () => {
      unsubCreate(); unsubComplete(); unsubLevel();
      unsubFocusEnter(); unsubFocusExit(); unsubDisc(); unsubStreak();
      if (displayTimerRef.current)  clearTimeout(displayTimerRef.current);
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [showMessage]);

  return (
    <div className="companion-bubble-anchor" aria-live="polite" aria-atomic="true">
      <AnimatePresence mode="wait">
        {message && (
          <motion.div
            key={message}
            className="companion-bubble"
            variants={bubbleVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="status"
          >
            {/* Avatar with breathing animation */}
            <motion.span
              className="companion-avatar"
              aria-hidden="true"
              variants={companionBreathVariants}
              initial="idle"
              animate="breathe"
            >
              ◈
            </motion.span>
            <p className="companion-text">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
