/**
 * Theme Provider (Stable — Phase A Final)
 *
 * Features:
 * - requestAnimationFrame-aligned DOM writes (prevents layout thrashing)
 * - Incremental variable diffing (no redundant DOM writes)
 * - Stale CSS variable removal (prevents ghost styles)
 * - Conditional cleanup — only on actual theme transitions (Issues #7, #10)
 * - Explicit invalid theme logging (no silent failures — Issue #8)
 * - Immediate mode architecture hook (Issue #8 future prep)
 * - Cleanup dependency order documented (Issue #7)
 * - Immutable variable map future note (Issue #9)
 * - Cleanup helpers extracted at module scope (no per-render GC pressure)
 */
import React, { useEffect, useRef } from 'react';
import { useThemeState } from '../state/AppStateContext';
import { Logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// THEME REGISTRY
// Add new themes here: 'workout', 'zen', 'night', 'aura', etc.
// ---------------------------------------------------------------------------
const themes = {
  /** System Default — Holographic Cyan */
  default: {
    '--bg-dark':        '#030712',
    '--bg-panel':       'rgba(15, 23, 42, 0.65)',
    '--primary':        '#00e5ff',
    '--aura-glow':      '0, 229, 255',
  },
  /** Deep focus — System Blue */
  focus: {
    '--bg-dark':        '#020617',
    '--bg-panel':       'rgba(2, 6, 23, 0.8)',
    '--primary':        '#3b82f6',
    '--aura-glow':      '59, 130, 246',
  },
  /** Locked-in discipline session — Danger Red / Boss Fight */
  discipline: {
    '--bg-dark':        '#050000',
    '--bg-panel':       'rgba(20, 0, 0, 0.7)',
    '--primary':        '#ef4444',
    '--aura-glow':      '239, 68, 68',
  },
  /** Victory / milestone — System Gold */
  victory: {
    '--bg-dark':        '#0a0800',
    '--bg-panel':       'rgba(20, 15, 0, 0.7)',
    '--primary':        '#fbbf24',
    '--aura-glow':      '251, 191, 36',
  },
  /** Burnout warning — Shadow Aura Purple */
  burnout: {
    '--bg-dark':        '#0f0518',
    '--bg-panel':       'rgba(20, 10, 30, 0.7)',
    '--primary':        '#8b5cf6',
    '--aura-glow':      '139, 92, 246',
  },
};


// ---------------------------------------------------------------------------
// IMMEDIATE MODE FLAG
// FIX #8 — IMMEDIATE THEME SWITCHING INFRASTRUCTURE:
// WHY: rAF batching adds up to ~16ms of visual latency. For behavioral states
//      that require instant visual feedback (e.g., discipline mode lockdown,
//      panic/urgent task alerts), rAF delay is perceptible and wrong.
//
// TODO (Phase B): Pass { immediate: true } from ThemeProvider props or a
//   special dispatch payload to bypass rAF and write CSS variables synchronously.
//   This flag is the architectural hook point for that future implementation.
//   Pattern: if (immediate) { applyVariables(); } else { rAF(applyVariables); }
// ---------------------------------------------------------------------------
const IMMEDIATE_MODE_ENABLED = false; // set true per-theme or per-event in Phase B

// ---------------------------------------------------------------------------
// STATIC CLEANUP HELPERS
// WHY module scope: defined inside the component, these allocate new function
//   objects on every React render. At 60fps with animations active, that is
//   ~3,600 wasted allocations per minute. Module-scope = allocated once.
//
// FIX #7 — CLEANUP DEPENDENCY ORDER (documented):
//   The order below is intentional and MUST be preserved as Phase B systems attach.
//
//   1. cleanupAnimations() — FIRST: animations may reference overlay DOM nodes.
//      Tearing down animations before overlays prevents reads on removed nodes
//      and avoids "Cannot read properties of null" errors in GSAP/WebGL code.
//
//   2. cleanupOverlays() — SECOND: overlays may contain audio context bindings.
//      Removing overlay portals after animation teardown ensures safe DOM removal
//      without triggering dangling animation callbacks.
//
//   3. cleanupThemeEffects() — LAST: theme effects (particles, WebGL, shaders)
//      may depend on both animations AND overlays being fully torn down first.
//      Cleaning theme effects last guarantees the canvas/WebGL context has no
//      active references before it is destroyed.
// ---------------------------------------------------------------------------
const cleanupAnimations = () => {
  // Phase B: cancel GSAP timelines, clear pending requestAnimationFrame IDs,
  //          stop CSS transition observers
};

const cleanupOverlays = () => {
  // Phase B: unmount overlay React portals, clear transition timer IDs,
  //          remove event listeners attached to overlay nodes
};

const cleanupThemeEffects = () => {
  // Phase B: stop canvas particle systems, destroy WebGL rendering contexts,
  //          disconnect AudioContext nodes tied to current theme ambience
};

// ---------------------------------------------------------------------------
// THEME PROVIDER
// ---------------------------------------------------------------------------
export function ThemeProvider({ children }) {
  const { state } = useThemeState();

  // FIX #9 — IMMUTABLE VARIABLE MAP (future concurrency note):
  // The mutable ref approach below (previousValuesRef as a plain object) is
  // correct and safe under React's current synchronous rendering model.
  // TODO (React 19+ concurrent rendering): If React begins interleaving renders
  //   on the same component instance, a mutable ref mutated during render could
  //   produce torn reads. At that point, replace previousValuesRef with an
  //   immutable Map snapshot: { current: new Map(previousValues) } produced
  //   inside the effect, never mutated across concurrent render boundaries.
  const previousValuesRef = useRef({});
  const previousThemeRef  = useRef(null);
  const rafHandleRef      = useRef(null);

  useEffect(() => {
    // INVALID THEME GUARD — explicit, not silent
    let themeConfig = themes[state.theme];
    if (!themeConfig) {
      Logger.warn(`ThemeProvider — unknown theme "${state.theme}", falling back to default`);
      themeConfig = themes.default;
    }

    const root         = document.documentElement;
    const currentKeys  = new Set(Object.keys(themeConfig));
    const previousKeys = Object.keys(previousValuesRef.current);
    const themeChanged = previousThemeRef.current !== state.theme;

    // CONDITIONAL CLEANUP — only on actual theme transitions:
    // WHY: Cleanup functions will eventually stop audio loops, destroy WebGL
    //      contexts, and cancel animations. Running them on every unrelated
    //      rerender (e.g., XP tick) would tear down active visual systems
    //      incorrectly. Guard ensures teardown only fires when the theme NAME
    //      changes, not when some other context slice re-renders ThemeProvider.
    if (themeChanged && previousThemeRef.current !== null) {
      // ORDER MATTERS — see static cleanup helper comments above
      cleanupAnimations();
      cleanupOverlays();
      cleanupThemeEffects();
    }

    // Cancel any pending rAF from a rapid theme switch before it fires
    if (rafHandleRef.current !== null) {
      cancelAnimationFrame(rafHandleRef.current);
    }

    // RAF-ALIGNED WRITES — single frame budget for all variable mutations
    // See IMMEDIATE_MODE_ENABLED above for future bypass hook.
    rafHandleRef.current = requestAnimationFrame(() => {
      // STALE VARIABLE REMOVAL: remove variables present in old theme but absent
      // from new theme — prevents ghost colors/gradients from persisting in DOM.
      previousKeys.forEach(prevKey => {
        if (!currentKeys.has(prevKey)) {
          root.style.removeProperty(prevKey);
          delete previousValuesRef.current[prevKey];
        }
      });

      // INCREMENTAL DIFF WRITE — only touch variables whose values changed
      let changedCount = 0;
      currentKeys.forEach(key => {
        const newVal  = themeConfig[key];
        const prevVal = previousValuesRef.current[key];
        if (newVal !== prevVal) {
          root.style.setProperty(key, newVal);
          previousValuesRef.current[key] = newVal;
          changedCount++;
        }
      });

      if (changedCount > 0) {
        Logger.info(`ThemeProvider — ${changedCount} CSS variable(s) updated for "${state.theme}"`);
      }

      previousThemeRef.current  = state.theme;
      rafHandleRef.current      = null;
    });

    // Cleanup: cancel pending rAF if theme changes again before frame fires
    return () => {
      if (rafHandleRef.current !== null) {
        cancelAnimationFrame(rafHandleRef.current);
        rafHandleRef.current = null;
      }
    };
  }, [state.theme]);

  return <>{children}</>;
}
