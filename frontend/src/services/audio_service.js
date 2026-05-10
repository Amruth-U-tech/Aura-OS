/**
 * Audio Service (Production-Grade)
 *
 * Features:
 * - Automatic ended-listener cleanup (prevents detached node accumulation)
 * - Per-sound concurrency limiting (prevents audio spam / CPU spikes)
 * - Playback throttling (duplicate suppression within a time window)
 * - Graceful browser autoplay-policy handling
 *
 * WHY clone + cleanup: HTMLAudioElement.cloneNode() creates a detached media
 *   element. Without an 'ended' listener to null the reference, long sessions
 *   accumulate thousands of GC-invisible media nodes, growing memory until
 *   the browser tab crashes or stutters.
 */
import { Logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------
const MAX_CONCURRENT = 3;      // Max simultaneous instances of one sound
const THROTTLE_MS    = 150;    // Min ms between consecutive plays of same sound

// ---------------------------------------------------------------------------
// RUNTIME STATE (module-scoped singletons — no React state involved)
// ---------------------------------------------------------------------------
const audioCache       = new Map(); // name → HTMLAudioElement (master, never played)
const activeCounts     = new Map(); // name → number of currently playing instances
const lastPlayedAt     = new Map(); // name → timestamp of last play

// ---------------------------------------------------------------------------
// AUDIO SERVICE
// ---------------------------------------------------------------------------
export const AudioService = {
  /**
   * Preload a sound into the cache.
   * Call this once at app startup for any sound you'll use at runtime.
   */
  preload: (name, url) => {
    if (audioCache.has(name)) return; // already loaded
    try {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audioCache.set(name, audio);
    } catch (e) {
      Logger.warn(`AudioService.preload — failed for "${name}"`, e);
    }
  },

  /**
   * Play a preloaded sound.
   * Respects concurrency limits and throttle window.
   */
  play: (name) => {
    const master = audioCache.get(name);
    if (!master) {
      Logger.warn(`AudioService.play — "${name}" not in cache (did you call preload?)`);
      return;
    }

    // THROTTLE: prevent the same sound from firing more than once per THROTTLE_MS
    const now  = Date.now();
    const last = lastPlayedAt.get(name) || 0;
    if (now - last < THROTTLE_MS) {
      Logger.debug(`AudioService.play — "${name}" throttled`);
      return;
    }

    // CONCURRENCY LIMIT: prevent audio spam from rapid user interactions
    const active = activeCounts.get(name) || 0;
    if (active >= MAX_CONCURRENT) {
      Logger.debug(`AudioService.play — "${name}" at max concurrency (${MAX_CONCURRENT})`);
      return;
    }

    try {
      // Clone so the master is never consumed; each clone is independent
      const clone = master.cloneNode();
      clone.volume = 0.5;

      // Track active count
      activeCounts.set(name, active + 1);
      lastPlayedAt.set(name, now);

      // CLEANUP LISTENER: decrement counter and null reference when playback ends.
      // WHY once:true — ensures the listener removes itself automatically after
      //   firing, preventing event listener accumulation on long sessions.
      clone.addEventListener('ended', () => {
        activeCounts.set(name, Math.max(0, (activeCounts.get(name) || 1) - 1));
        // No reference to clone remains after this — eligible for GC
      }, { once: true });

      clone.play().catch(err => {
        // Browsers block autoplay without prior user interaction — handle gracefully
        activeCounts.set(name, Math.max(0, (activeCounts.get(name) || 1) - 1));
        Logger.warn(`AudioService.play — browser blocked autoplay for "${name}"`, err);
      });
    } catch (error) {
      Logger.error(`AudioService.play — unexpected error for "${name}"`, error);
    }
  }
};
