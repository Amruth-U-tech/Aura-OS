/**
 * useFocusMode — Focus Mode Lifecycle Hook
 *
 * Manages the full focus mode state machine:
 * - Debounced toggle (prevents rapid double-activation bugs)
 * - EventBus dispatch on enter/exit
 * - Ambient sound lifecycle (start on enter, fade on exit)
 * - Safe cleanup on unmount
 *
 * Returns: { isFocused, toggleFocus, enterFocus, exitFocus }
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { EventBus, EventTypes } from '../events/eventBus';
import { SoundEngine } from '../services/soundEngine';
import { Logger } from '../utils/logger';

const DEBOUNCE_MS = 400; // prevent rapid toggle glitches

export function useFocusMode() {
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef(null);

  const enterFocus = useCallback(() => {
    setIsFocused(true);
    EventBus.dispatch(EventTypes.FOCUS_MODE_ENTERED);
    SoundEngine.play('focus_enter');
    // Start ambient after brief delay to let enter sound play first
    setTimeout(() => SoundEngine.startAmbient('focus_ambient'), 600);
    Logger.info('useFocusMode — Focus Mode entered');
  }, []);

  const exitFocus = useCallback(() => {
    setIsFocused(false);
    EventBus.dispatch(EventTypes.FOCUS_MODE_EXITED);
    SoundEngine.stopAmbient(800);
    SoundEngine.play('focus_exit');
    Logger.info('useFocusMode — Focus Mode exited');
  }, []);

  const toggleFocus = useCallback(() => {
    // Clear any pending debounce from a previous rapid click
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      // Functional setState ensures we read the actual current state,
      // not a stale closure capture — critical for debounced toggles.
      setIsFocused(prev => {
        if (prev) {
          // Schedule exit effects outside setState for clean separation
          Promise.resolve().then(exitFocus);
          return false;
        } else {
          Promise.resolve().then(enterFocus);
          return true;
        }
      });
      debounceRef.current = null;
    }, DEBOUNCE_MS);
  }, [enterFocus, exitFocus]);

  // Cleanup on unmount: cancel debounce and stop any active ambient
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      SoundEngine.stopAmbient(300);
    };
  }, []);

  return { isFocused, toggleFocus, enterFocus, exitFocus };
}
