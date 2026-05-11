/**
 * Centralized Logger Utility (Production-Grade)
 *
 * Features:
 * - Log level filtering (prevents noisy diagnostics in production)
 * - Log throttling (prevents high-frequency console flooding)
 * - Grouped logging for structured debugging
 * - Production-safe suppression
 *
 * WHY: Future AI/realtime systems can emit thousands of events per second.
 *      Without throttling, logging itself becomes a performance bottleneck.
 */

// ---------------------------------------------------------------------------
// LOG LEVELS: numeric ranking allows simple >= comparisons
// ---------------------------------------------------------------------------
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

// Active minimum level — raise to 'warn' in staging, 'error' in production.
// import.meta.env.PROD is Vite's canonical production boolean — always reliable
// in browser bundles. process.env.NODE_ENV works too but is a Node.js pattern.
const CURRENT_LEVEL = import.meta.env.PROD ? LOG_LEVELS.error : LOG_LEVELS.debug;

// ---------------------------------------------------------------------------
// THROTTLE REGISTRY
// WHY: Prevents the same repeated log from flooding the console 60×/sec
//      during tight event loops (e.g., realtime analytics, AI streaming)
// ---------------------------------------------------------------------------
const throttleCache = new Map();
const THROTTLE_MS = 1000; // one unique message per key per second

function isThrottled(key) {
  const now = Date.now();
  const last = throttleCache.get(key) || 0;
  if (now - last < THROTTLE_MS) return true;
  throttleCache.set(key, now);
  return false;
}

// ---------------------------------------------------------------------------
// CORE LOGGER
// ---------------------------------------------------------------------------
export const Logger = {
  debug: (message, data = {}) => {
    if (CURRENT_LEVEL > LOG_LEVELS.debug) return;
    if (isThrottled(`debug:${message}`)) return;
    console.debug(`[DEBUG] ${message}`, data);
  },

  info: (message, data = {}) => {
    if (CURRENT_LEVEL > LOG_LEVELS.info) return;
    if (isThrottled(`info:${message}`)) return;
    console.log(`[INFO] ${message}`, data);
  },

  warn: (message, data = {}) => {
    if (CURRENT_LEVEL > LOG_LEVELS.warn) return;
    if (isThrottled(`warn:${message}`)) return;
    console.warn(`[WARN] ${message}`, data);
  },

  error: (message, error = null) => {
    // Errors are NEVER throttled — always surface them
    // In production, swap console.error for a real telemetry service (e.g., Sentry)
    console.error(`[ERROR] ${message}`, error);
  },

  event: (eventName, payload) => {
    if (CURRENT_LEVEL > LOG_LEVELS.debug) return;
    if (isThrottled(`event:${eventName}`)) return;
    console.log(`[EVENT] ${eventName}`, payload);
  },

  /**
   * group() — structured multi-line output for complex objects.
   * WHY: When debugging AI pipeline responses or ML payloads,
   *      a collapsed group is far more readable than a flat log.
   */
  group: (label, fn) => {
    if (CURRENT_LEVEL > LOG_LEVELS.debug) return;
    console.groupCollapsed(`[GROUP] ${label}`);
    try { fn(); } finally { console.groupEnd(); }
  }
};
