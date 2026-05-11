/**
 * Centralized Event Bus Architecture (Stable — Phase A Final)
 *
 * Features:
 * - Map-based listener storage (prototype-pollution-safe)
 * - Set<callback> per event (duplicate prevention)
 * - Controlled recursion depth — MAX_EVENT_DEPTH (composable, not blocked)
 * - Batched single Promise.resolve() async dispatch (prevents microtask flooding)
 * - Exception-safe try/finally depth decrement (Issue #1)
 * - Dead channel cleanup on unsubscribe (Issue #2)
 * - Immutable snapshot iteration (prevents mutation-during-dispatch bugs)
 * - Strict event name validation (O(1) Set lookup)
 * - Strict callback type validation
 *
 * WHY Map vs plain object:
 *   Plain objects inherit Object.prototype. Keys like "constructor" or "toString"
 *   silently collide with event names in complex systems. Maps have no prototype.
 */
import { Logger } from "../utils/logger";

// Map<eventName: string, Set<callback: Function>>
const listeners = new Map();

// ---------------------------------------------------------------------------
// RECURSION DEPTH TRACKER
// Map<eventName: string, depth: number>
// Allows valid shallow nesting (TASK_COMPLETED → XP_GAINED → LEVEL_UP)
// while hard-stopping runaway infinite loops.
// ---------------------------------------------------------------------------
const dispatchDepth = new Map();
const MAX_EVENT_DEPTH = 5;

// ---------------------------------------------------------------------------
// EVENT TYPE REGISTRY
// ---------------------------------------------------------------------------
export const EventTypes = {
  // ── Core task events ──────────────────────────────────────────────────────
  TASK_CREATED:              'TASK_CREATED',
  TASK_DELETED:              'TASK_DELETED',
  TASK_COMPLETED:            'TASK_COMPLETED',
  // ── Session mode events ───────────────────────────────────────────────────
  MISSION_STARTED:           'MISSION_STARTED',
  FOCUS_MODE_ENTERED:        'FOCUS_MODE_ENTERED',
  FOCUS_MODE_EXITED:         'FOCUS_MODE_EXITED',
  DISCIPLINE_MODE_ENTERED:   'DISCIPLINE_MODE_ENTERED',
  DISCIPLINE_MODE_EXITED:    'DISCIPLINE_MODE_EXITED',
  // ── Progression events ────────────────────────────────────────────────────
  XP_GAINED:                 'XP_GAINED',
  LEVEL_UP:                  'LEVEL_UP',
  STREAK_UPDATED:            'STREAK_UPDATED',
  // ── AI companion events ───────────────────────────────────────────────────
  COMPANION_MESSAGE:         'COMPANION_MESSAGE',
  // ── System events ─────────────────────────────────────────────────────────
  ERROR_OCCURRED:            'ERROR_OCCURRED',
  // Dispatched by api_service when the first request times out — most likely
  // a Render free-tier cold start (10–30 s wake-up delay). UI listens to this
  // to show an immersive "Waking core systems..." state instead of an error.
  BACKEND_WAKING:            'BACKEND_WAKING',
};

// Pre-computed O(1) validation set — avoids Object.values() on every call
const VALID_EVENTS = new Set(Object.values(EventTypes));

// ---------------------------------------------------------------------------
// EVENT BUS
// ---------------------------------------------------------------------------
export const EventBus = {
  /**
   * Subscribe to an event.
   * Always store the returned unsubscribe fn and call it in useEffect cleanup.
   */
  on: (event, callback) => {
    // GUARD: block unknown event names (catches typos like XP_GAIEND at registration)
    if (!VALID_EVENTS.has(event)) {
      Logger.warn(`EventBus.on — invalid event name blocked: "${event}"`);
      return () => {};
    }

    // GUARD: block non-function callbacks before they corrupt the listener Set
    if (typeof callback !== 'function') {
      Logger.warn(`EventBus.on — non-function callback rejected for: "${event}"`);
      return () => {};
    }

    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }

    // Set.add() is idempotent — prevents duplicate listener registration silently
    listeners.get(event).add(callback);

    // Return stable unsubscribe closure
    return () => {
      const set = listeners.get(event);
      if (!set) return;

      set.delete(callback);

      // FIX #2 — DEAD CHANNEL CLEANUP:
      // When the last subscriber unregisters, remove the empty Set from the Map.
      // WHY: In long-running sessions (or PWAs), hundreds of components can mount
      //      and unmount. Without this, the listeners Map silently accumulates dead
      //      channels, growing indefinitely and slowing down Map operations over time.
      if (set.size === 0) {
        listeners.delete(event);
      }
    };
  },

  /**
   * Dispatch an event with a payload.
   * All listeners execute inside a single async Promise boundary.
   *
   * TODO (scheduler migration):
   *   Promise.resolve() uses the microtask queue which is sufficient for
   *   current event throughput. For future high-frequency realtime systems
   *   (AI token streaming, OpenCV frame events, multiplayer sync), consider
   *   migrating to MessageChannel (macrotask) or the emerging
   *   scheduler.postTask() API for priority-aware scheduling.
   *   Reference: https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/postTask
   */
  dispatch: (event, payload = {}) => {
    // GUARD: block unknown event names at dispatch time
    if (!VALID_EVENTS.has(event)) {
      Logger.warn(`EventBus.dispatch — invalid event name blocked: "${event}"`);
      return;
    }

    const listenerSet = listeners.get(event);
    if (!listenerSet || listenerSet.size === 0) return;

    Logger.event(event, payload);

    // CONTROLLED RECURSION PROTECTION
    const currentDepth = dispatchDepth.get(event) || 0;
    if (currentDepth >= MAX_EVENT_DEPTH) {
      Logger.warn(`EventBus.dispatch — max depth (${MAX_EVENT_DEPTH}) reached for: "${event}"`);
      return;
    }

    dispatchDepth.set(event, currentDepth + 1);

    // IMMUTABLE SNAPSHOT: capture listener list before async boundary.
    // WHY: a listener can unsubscribe itself mid-dispatch; iterating the live
    //      Set would skip the next callback in iteration order unpredictably.
    const snapshot = [...listenerSet];

    // BATCHED ASYNC DISPATCH — single scheduling point for entire listener batch
    Promise.resolve().then(() => {
      // FIX #1 — EXCEPTION-SAFE DEPTH DECREMENT via try/finally:
      // WHY: If a catastrophic runtime error escapes our per-listener try/catch
      //      (e.g., an engine-level error like stack overflow from external code),
      //      the depth counter would stay incremented permanently — locking future
      //      dispatches of this event at MAX_EVENT_DEPTH and breaking the system.
      //      try/finally guarantees the decrement runs regardless of what happens.
      try {
        snapshot.forEach(callback => {
          try {
            callback(payload);
          } catch (err) {
            // Per-listener isolation: one bad listener cannot skip the rest
            Logger.error(`EventBus — listener error for "${event}"`, err);
          }
        });
      } finally {
        // Always decrement depth after batch completes — even on catastrophic failure
        const depth = dispatchDepth.get(event) || 1;
        if (depth <= 1) {
          dispatchDepth.delete(event);
        } else {
          dispatchDepth.set(event, depth - 1);
        }
      }
    });
  }
};
