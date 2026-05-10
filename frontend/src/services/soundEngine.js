/**
 * Sound Engine — Phase B.1 (Real File Integration)
 *
 * Architecture:
 * - SOUND_CATALOG: maps abstract category keys → { files[], volume, throttleMs, maxConcurrent }
 *   WHY arrays: supports future multi-file random selection without any API changes.
 *   Callers always use the same key (e.g. 'xp_gain'). The engine picks which file internally.
 *
 * - Lazy Howl creation: instances are created on first play, not at startup.
 *   WHY: avoids blocking the initial render with N audio decode operations.
 *
 * - Per-category throttle: each category has its own lastPlayed timestamp + throttleMs.
 *   WHY per-category (not per-key): 'meme_bruh' and 'meme_lazy' share the same
 *   category throttle so rapid bad-task spam doesn't stack multiple meme sounds.
 *
 * - Per-category concurrency limit: tracks how many instances of one category are playing.
 *   WHY: rapid XP gains from batch-completion could stack 6 identical XP chimes.
 *
 * - Ambient: singleton pattern — only one ambient plays at a time, with fade in/out.
 *   WHY: stacking ambient loops destroys the atmospheric quality of the sound design.
 *
 * Focus ambience files are intentionally EXCLUDED from this catalog. They are large
 * (1MB–18MB) and require separate streaming/lazy logic in a future phase.
 */
import { Howl } from 'howler';
import { Logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// SOUND CATALOG
// Each entry defines the full category config.
// 'files' is an array to support future random selection (Phase C).
// volume / throttleMs / maxConcurrent are tuned per emotional weight.
// ---------------------------------------------------------------------------
const SOUND_CATALOG = {
  // ── Reward: XP gain ────────────────────────────────────────────────────────
  // Subtle, short, satisfying. Low volume to not overpower the UI.
  xp_gain: {
    files:         ['/sounds/rewards/xp/oh-my-god-meme.mp3'],
    volume:        0.30,
    throttleMs:    800,   // fast tasks shouldn't triple-fire this
    maxConcurrent: 1,
  },

  // ── Reward: Level up ───────────────────────────────────────────────────────
  // Stronger emotional impact — milestone event. Slightly louder.
  level_up: {
    files:         ['/sounds/rewards/levelup/anime-wow-sound-effect.mp3'],
    volume:        0.50,
    throttleMs:    3000,  // one per level-up cycle, never stacks
    maxConcurrent: 1,
  },

  // ── Reward: Achievement ────────────────────────────────────────────────────
  // Architecture hook for future streak milestones / mission completions.
  achievement: {
    files:         ['/sounds/rewards/achivement/chalo.mp3'],
    volume:        0.40,
    throttleMs:    5000,  // achievements are rare — no spam
    maxConcurrent: 1,
  },

  // ── Meme: Bruh (high distraction score) ───────────────────────────────────
  meme_bruh: {
    files:         ['/sounds/meme/bruh/bruh.mp3'],
    volume:        0.45,
    throttleMs:    4000,
    maxConcurrent: 1,
  },

  // ── Meme: Lazy (medium distraction, slothful vibes) ───────────────────────
  meme_lazy: {
    files:         ['/sounds/meme/lazy/dexter-meme.mp3'],
    volume:        0.45,
    throttleMs:    4000,
    maxConcurrent: 1,
  },

  // ── Meme: Sus (ambiguous / suspicious intent) ──────────────────────────────
  meme_sus: {
    files:         ['/sounds/meme/sus/53b1bab6-a8c3-4a1a-82db-7110ce1c29ef_6KNDGWD.mp3'],
    volume:        0.45,
    throttleMs:    4000,
    maxConcurrent: 1,
  },

  // ── Meme: Troll (user is clearly trolling the system) ─────────────────────
  meme_troll: {
    files:         ['/sounds/meme/troll/galaxy-meme.mp3'],
    volume:        0.45,
    throttleMs:    4000,
    maxConcurrent: 1,
  },

  // ── Meme: Fail (self-destructive / avoidant task) ─────────────────────────
  meme_fail: {
    files:         ['/sounds/meme/fail/fahhhhhhhhhhhhhh.mp3'],
    volume:        0.45,
    throttleMs:    4000,
    maxConcurrent: 1,
  },

  // ── Aura: Energy (focus mode entered / discipline activated) ──────────────
  // Atmospheric, not loud. Signals a mode shift.
  aura_energy: {
    files:         ['/sounds/aura/energy/im-the-doom-slayer.mp3'],
    volume:        0.25,
    throttleMs:    2000,
    maxConcurrent: 1,
  },

  // ── Aura: Focus shift (entering/exiting focus mode) ───────────────────────
  aura_focus_shift: {
    files:         ['/sounds/aura/focus-shift/squid-game-gi-hun-konusma.mp3'],
    volume:        0.20,
    throttleMs:    2000,
    maxConcurrent: 1,
  },

  // ── Aura: Burnout warning (burnout theme activated) ───────────────────────
  aura_burnout: {
    files:         ['/sounds/aura/burnout/yeeaahboiiii.mp3'],
    volume:        0.25,
    throttleMs:    5000,
    maxConcurrent: 1,
  },

  // ── Aura: Dark mode shift ─────────────────────────────────────────────────
  aura_darkmode: {
    files:         ['/sounds/aura/darkmode/auraa.mp3'],
    volume:        0.20,
    throttleMs:    2000,
    maxConcurrent: 1,
  },
};

// ---------------------------------------------------------------------------
// MEME CATEGORY SHARED THROTTLE
// All meme sounds share ONE cooldown pool.
// WHY: 'meme_bruh' + 'meme_lazy' should not both fire on the same bad task.
//      One meme reaction per task creation event is enough.
// ---------------------------------------------------------------------------
const MEME_KEYS      = new Set(['meme_bruh', 'meme_lazy', 'meme_sus', 'meme_troll', 'meme_fail']);
const MEME_COOLDOWN  = 5000; // ms between ANY meme sound
let   lastMemePlayed = 0;

// ---------------------------------------------------------------------------
// RUNTIME STATE
// Lazy Howl cache, per-key throttle, per-key active count
// ---------------------------------------------------------------------------
const howlCache      = new Map(); // key → Howl instance (reused, not recreated)
const lastPlayed     = new Map(); // key → timestamp of last play
const activeCounts   = new Map(); // key → number of currently playing instances
let   currentAmbient = null;      // single ambient slot

// ---------------------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------------------

/**
 * Pick a file from the catalog's files array.
 * Currently picks index 0. In Phase C, swap for Math.random() selection
 * without any change to calling code.
 * @param {string[]} files
 * @returns {string}
 */
function pickFile(files) {
  if (!files || files.length === 0) return null;
  // Phase C: return files[Math.floor(Math.random() * files.length)];
  return files[0];
}

/**
 * Get or create a Howl instance for the given catalog key.
 * Instances are cached — one Howl per key, reused across plays.
 */
function getOrCreateHowl(key) {
  if (howlCache.has(key)) return howlCache.get(key);

  const config = SOUND_CATALOG[key];
  if (!config) {
    Logger.warn(`SoundEngine — unknown catalog key: "${key}"`);
    return null;
  }

  const src = pickFile(config.files);
  if (!src) return null;

  const howl = new Howl({
    src:     [src],
    volume:  config.volume,
    preload: false, // explicit opt-in preload only — lazy by default
    onloaderror: (id, err) => {
      Logger.warn(`SoundEngine — "${key}" failed to load (${src}). File missing from /public/.`);
    },
    onend: () => {
      // Decrement active count when playback finishes naturally
      const current = activeCounts.get(key) || 1;
      activeCounts.set(key, Math.max(0, current - 1));
    },
  });

  howlCache.set(key, howl);
  return howl;
}

/**
 * Returns true if the key is within its throttle window.
 * Also enforces the shared meme cooldown for all meme_* keys.
 */
function isThrottled(key) {
  const now    = Date.now();
  const config = SOUND_CATALOG[key];
  if (!config) return false;

  // Shared meme cooldown check
  if (MEME_KEYS.has(key)) {
    if (now - lastMemePlayed < MEME_COOLDOWN) return true;
  }

  const last     = lastPlayed.get(key) || 0;
  const throttle = config.throttleMs || 300;
  return (now - last) < throttle;
}

/**
 * Record a play timestamp (and shared meme timestamp if applicable).
 */
function recordPlay(key) {
  lastPlayed.set(key, Date.now());
  if (MEME_KEYS.has(key)) lastMemePlayed = Date.now();
}

// ---------------------------------------------------------------------------
// PUBLIC API
// ---------------------------------------------------------------------------
export const SoundEngine = {
  /**
   * Play a one-shot sound by catalog key.
   * Respects per-category throttle, meme shared cooldown, and max concurrency.
   */
  play: (key) => {
    if (!SOUND_CATALOG[key]) {
      Logger.warn(`SoundEngine.play — unknown key: "${key}"`);
      return;
    }

    if (isThrottled(key)) return;

    const config  = SOUND_CATALOG[key];
    const active  = activeCounts.get(key) || 0;
    if (active >= (config.maxConcurrent || 1)) return;

    const howl = getOrCreateHowl(key);
    if (!howl) return;

    try {
      activeCounts.set(key, active + 1);
      recordPlay(key);
      howl.play();
    } catch (err) {
      Logger.error(`SoundEngine.play — error for "${key}"`, err);
      activeCounts.set(key, Math.max(0, (activeCounts.get(key) || 1) - 1));
    }
  },

  /**
   * Start a looping ambient sound, fading out any currently active ambient.
   * Focus ambience files are handled separately — pass explicit src string.
   * NOTE: Focus files (focus/, rain/, zen/) are intentionally excluded from
   *       the SOUND_CATALOG. This method accepts a catalog key OR a raw path.
   */
  startAmbient: (keyOrPath, volume = 0.25, fadeMs = 1500) => {
    SoundEngine.stopAmbient(Math.min(fadeMs / 2, 500));

    // Resolve: catalog key → first file; raw path → used directly
    const config = SOUND_CATALOG[keyOrPath];
    const src    = config ? pickFile(config.files) : keyOrPath;
    if (!src) return;

    const ambientHowl = new Howl({
      src:    [src],
      loop:   true,
      volume: 0,
      onloaderror: () => {
        Logger.warn(`SoundEngine — ambient failed to load: "${src}"`);
      },
    });

    ambientHowl.play();
    ambientHowl.fade(0, volume, fadeMs);
    currentAmbient = ambientHowl;
    Logger.info(`SoundEngine — ambient started: "${src}"`);
  },

  /**
   * Stop the current ambient sound with a fade-out.
   */
  stopAmbient: (fadeMs = 800) => {
    if (!currentAmbient) return;
    const toStop   = currentAmbient;
    currentAmbient = null;

    try {
      const vol = toStop.volume();
      toStop.fade(vol, 0, fadeMs);
      setTimeout(() => {
        try { toStop.stop(); toStop.unload(); } catch (_) {}
      }, fadeMs + 100);
    } catch (_) {}
  },

  /**
   * Eagerly preload a list of catalog keys.
   * Call at startup for sounds expected in the first few seconds of interaction.
   * DO NOT preload large ambient files — they load lazily on first startAmbient().
   */
  preload: (keys = []) => {
    keys.forEach(key => {
      const howl = getOrCreateHowl(key);
      if (howl) howl.load(); // explicitly trigger load
    });
  },

  /**
   * Returns all known catalog keys — useful for future admin/debug panels.
   */
  getCatalogKeys: () => Object.keys(SOUND_CATALOG),
};
