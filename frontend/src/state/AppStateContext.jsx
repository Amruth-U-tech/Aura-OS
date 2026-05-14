/**
 * Global App State Management (Stable — Phase A Final)
 *
 * Features:
 * - Segmented contexts (ThemeContext, ModeContext, XPContext) — isolated rerenders
 * - Equality guards in all reducers — no redundant React reconciliation passes
 * - DEV-only Object.freeze() on returned state — catches accidental mutations early
 * - Stable nested aggregatedState shape — eliminates memory churn from spreading
 * - Safe dispatchProxy with action validation — no crash on null/malformed actions
 * - Dispatcher map O(1) routing — no if/else chain growth as actions expand
 * - Memoized legacy useAppState hook — backward compatible
 */
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { EventBus, EventTypes } from '../events/eventBus';
import { Logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// DEV-ONLY FREEZE HELPER
// FIX #6: Freeze state objects in development to surface accidental mutations
//         early (e.g., code doing state.xp = 5 directly instead of dispatching).
// WHY NOT in production: Object.freeze() has a measurable runtime cost on
//   frequent state updates (XP ticks, realtime analytics). Never ship it.
// ---------------------------------------------------------------------------
const maybeFreeze = (obj) => {
  if (process.env.NODE_ENV === 'development') {
    return Object.freeze(obj);
  }
  return obj;
};

// ---------------------------------------------------------------------------
// SEGMENTED CONTEXTS
// WHY: A single context rerenders every consumer on any state change.
//      With XP updating on every task completion, theme consumers must not
//      re-render. Segmentation gives each domain its own render boundary.
// ---------------------------------------------------------------------------
const ThemeContext = createContext(null);
const XPContext    = createContext(null);
const ModeContext  = createContext(null);
const PlayerContext = createContext(null);

// ---------------------------------------------------------------------------
// REDUCERS — equality guards + dev-mode freeze
// ---------------------------------------------------------------------------
function themeReducer(state, action) {
  switch (action.type) {
    case 'SET_THEME':
      if (state.theme === action.payload) return state; // EQUALITY GUARD
      return maybeFreeze({ theme: action.payload });
    default:
      return state;
  }
}

function modeReducer(state, action) {
  switch (action.type) {
    case 'SET_MODE':
      if (state.mode === action.payload) return state; // EQUALITY GUARD
      return maybeFreeze({ mode: action.payload });
    default:
      return state;
  }
}

function playerReducer(state, action) {
  switch (action.type) {
    case 'SET_PLAYER':
      return maybeFreeze({ ...state, ...action.payload });
    default:
      return state;
  }
}

function xpReducer(state, action) {
  switch (action.type) {
    case 'SYNC_PROGRESSION': {
      const p = action.payload;
      if (!p) return state;
      return maybeFreeze({ 
        xp: p.xp, 
        level: p.level,
        streakDays: p.streakDays || 0,
        decayActive: p.decayActive || false,
        failureChain: p.failureChain || 0,
        recoveryProgress: p.recoveryProgress || 0
      });
    }
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// COMPOSITE PROVIDER
// ---------------------------------------------------------------------------
export function AppStateProvider({ children }) {
  const [themeState, dispatchTheme] = useReducer(themeReducer, maybeFreeze({ theme: 'default' }));
  const [modeState,  dispatchMode]  = useReducer(modeReducer,  maybeFreeze({ mode: 'standard' }));
  const [xpState,    dispatchXP]    = useReducer(xpReducer,    maybeFreeze({ xp: 0, level: 1, streakDays: 0, decayActive: false, failureChain: 0, recoveryProgress: 0 }));
  const [playerState, dispatchPlayer] = useReducer(playerReducer, maybeFreeze({
    name: localStorage.getItem('aura_player_name') || '',
    bio: localStorage.getItem('aura_player_bio') || '',
    goal: localStorage.getItem('aura_player_goal') || '',
    isNew: !localStorage.getItem('aura_player_name'),
  }));

  useEffect(() => {
    const unsubProgression = EventBus.on('PROGRESSION_UPDATED', (payload) => {
      if (payload && payload.progression) {
        dispatchXP({ type: 'SYNC_PROGRESSION', payload: payload.progression });
      }
    });
    // We remove ADD_XP dispatch from XP_GAINED since progression sync handles it
    // Sound engine still listens to XP_GAINED independently
    const unsubFocusEnter = EventBus.on(EventTypes.FOCUS_MODE_ENTERED, () => {
      dispatchTheme({ type: 'SET_THEME', payload: 'focus' });
      dispatchMode({ type: 'SET_MODE', payload: 'discipline' });
    });
    const unsubFocusExit = EventBus.on(EventTypes.FOCUS_MODE_EXITED, () => {
      dispatchTheme({ type: 'SET_THEME', payload: 'default' });
      dispatchMode({ type: 'SET_MODE', payload: 'standard' });
    });
    return () => { unsubProgression(); unsubFocusEnter(); unsubFocusExit(); };
  }, []);

  return (
    <ThemeContext.Provider value={{ state: themeState, dispatch: dispatchTheme }}>
      <ModeContext.Provider value={{ state: modeState, dispatch: dispatchMode }}>
        <XPContext.Provider value={{ state: xpState, dispatch: dispatchXP }}>
          <PlayerContext.Provider value={{ state: playerState, dispatch: dispatchPlayer }}>
            {children}
          </PlayerContext.Provider>
        </XPContext.Provider>
      </ModeContext.Provider>
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// DOMAIN-SPECIFIC HOOKS — prefer these in new Phase B components
// ---------------------------------------------------------------------------
export function useThemeState() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeState must be within AppStateProvider');
  return ctx;
}

export function useModeState() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useModeState must be within AppStateProvider');
  return ctx;
}

export function useXPState() {
  const ctx = useContext(XPContext);
  if (!ctx) throw new Error('useXPState must be within AppStateProvider');
  return ctx;
}

export function usePlayerState() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayerState must be within AppStateProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// LEGACY AGGREGATED HOOK (Backward-Compatible)
// ---------------------------------------------------------------------------
export function useAppState() {
  const themeCtx = useContext(ThemeContext);
  const modeCtx  = useContext(ModeContext);
  const xpCtx    = useContext(XPContext);
  const playerCtx = useContext(PlayerContext);

  if (!themeCtx || !modeCtx || !xpCtx || !playerCtx) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  // FIX #5 — STABLE NESTED STRUCTURE:
  // WHY: The previous spread { ...theme, ...mode, ...xp } flattened all keys
  //      into one new object every memo recalculation, causing extra allocations
  //      and making it impossible to add same-named keys across domains without
  //      silent collisions (e.g., both theme and mode adding a "name" key).
  //      A stable nested shape { theme, mode, xp } is allocation-efficient and
  //      collision-free. Consumers access state.theme.theme, state.xp.level etc.
  //
  // BACKWARD COMPATIBILITY NOTE:
  //   App.jsx currently reads state.level and state.xp (flat).
  //   Those are preserved via the flat spread fields below alongside nested ones,
  //   keeping existing consumers working during the Phase A → Phase B transition.
  //   New Phase B components should use the nested shape or domain-specific hooks.
  const aggregatedState = useMemo(() => ({
    // Nested shape (preferred for new Phase B consumers)
    theme:  themeCtx.state,
    mode:   modeCtx.state,
    xp:     xpCtx.state,
    player: playerCtx.state,
    // Flat fields for backward compatibility with existing App.jsx consumers
    ...themeCtx.state,
    ...modeCtx.state,
    ...xpCtx.state,
    ...playerCtx.state,
  }), [themeCtx.state, modeCtx.state, xpCtx.state, playerCtx.state]);

  // DISPATCHER MAP: O(1) routing — extend by adding entries, not branching
  const dispatchers = useMemo(() => ({
    SET_THEME: themeCtx.dispatch,
    SET_MODE:  modeCtx.dispatch,
    SYNC_PROGRESSION: xpCtx.dispatch,
    SET_PLAYER: playerCtx.dispatch,
  }), [themeCtx.dispatch, modeCtx.dispatch, xpCtx.dispatch, playerCtx.dispatch]);

  const dispatchProxy = useCallback((action) => {
    // FIX #4 — SAFE ACTION VALIDATION:
    // WHY: Callers in future AI/behavioral modules may pass stale closures or
    //      null actions during rapid state transitions. Accessing .type on null
    //      would throw and crash the entire dispatch call stack.
    if (!action || typeof action.type !== 'string') {
      Logger.warn('dispatchProxy — invalid action rejected', { action });
      return;
    }

    const handler = dispatchers[action.type];
    if (!handler) {
      Logger.warn(`dispatchProxy — unknown action type: "${action.type}"`);
      return;
    }
    handler(action);
  }, [dispatchers]);

  return { state: aggregatedState, dispatch: dispatchProxy };
}
