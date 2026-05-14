/**
 * useXPSystem — XP Progression Hook (Phase B.1)
 *
 * Manages the XP/level experience layer:
 * - Reads from XPContext (segmented — only rerenders on XP changes)
 * - Detects level transitions and dispatches LEVEL_UP event
 * - Plays achievement sound on milestone levels (every 5 levels)
 * - Exposes showLevelUp flag and xpPercentage for XPBar.jsx
 *
 * WHY milestone at every 5 levels (not every level):
 *   Frequent achievements lose emotional weight. Spacing them keeps
 *   the achievement sound feeling special and earned.
 */
import { useState, useRef, useEffect } from 'react';
import { useXPState } from '../state/AppStateContext';
import { EventBus, EventTypes } from '../events/eventBus';
import { SoundEngine } from '../services/soundEngine';
import { Logger } from '../utils/logger';

const XP_PER_LEVEL = 1000;
const LEVEL_UP_SHOW_MS = 3000; // level-up badge display duration
const MILESTONE_EVERY = 5;    // play achievement sound every N levels

export function useXPSystem() {
  const { state } = useXPState();
  const prevLevelRef = useRef(state.level);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    const prevLevel = prevLevelRef.current;

    if (state.level > prevLevel) {
      Logger.info(`useXPSystem — Level up: ${prevLevel} → ${state.level}`);

      // Dispatch LEVEL_UP — App.jsx and CompanionBubble both listen to this
      EventBus.dispatch(EventTypes.LEVEL_UP, { level: state.level });

      // Level-up sound (throttled inside SoundEngine — safe to call every level)
      SoundEngine.play('level_up');

      // Achievement sound at milestone levels (5, 10, 15…)
      if (state.level % MILESTONE_EVERY === 0) {
        // Small delay so level_up and achievement don't overlap acoustically
        setTimeout(() => SoundEngine.play('achievement'), 1200);
        EventBus.dispatch(EventTypes.STREAK_UPDATED, { count: state.level });
      }

      setShowLevelUp(true);
      prevLevelRef.current = state.level;

      const timer = setTimeout(() => setShowLevelUp(false), LEVEL_UP_SHOW_MS);
      return () => clearTimeout(timer);
    }

    prevLevelRef.current = state.level;
  }, [state.level]);

  // XP within the current level as 0–1 fraction for XPBar width
  const xpIntoLevel = state.xp % XP_PER_LEVEL;
  const xpPercentage = xpIntoLevel / XP_PER_LEVEL;

  return {
    xp: state.xp,
    level: state.level,
    xpPercentage, // 0.0–1.0
    showLevelUp,
    decayActive: state.decayActive,
    streakDays: state.streakDays,
  };
}
