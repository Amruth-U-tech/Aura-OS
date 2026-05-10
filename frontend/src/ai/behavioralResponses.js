/**
 * Behavioral Response Engine — Phase B.1
 *
 * Classifies task titles into behavioral categories using weighted keyword scoring.
 * Maps categories to companion messages and sound catalog keys.
 *
 * Design:
 * - Scoring is additive: a title matching 3 lazy keywords scores higher than
 *   one matching 1 productive keyword, even if productive has higher weight.
 *   This prevents false positives from single-word matches.
 *
 * - Context modifier: checks for NEGATION or QUALIFIER words that flip intent.
 *   "skip gym" → lazy (not productive despite 'gym')
 *   "instagram marketing strategy" → qualified professional context (not meme)
 *
 * - Meme sound selection: maps lazy sub-categories to specific meme keys
 *   so the reaction feels intentional, not random.
 */
import { companionPrompts, pickMessage } from './companionPrompts';

// ---------------------------------------------------------------------------
// SCORING RULES
// weight: score multiplier per matched keyword
// Higher weight = category dominates with fewer matches
// ---------------------------------------------------------------------------
const BEHAVIOR_RULES = {
  productive: {
    keywords: [
      'gym', 'workout', 'study', 'assignment', 'exam', 'read', 'code',
      'build', 'learn', 'practice', 'run', 'meditate', 'deep work',
      'project', 'review', 'write', 'prepare', 'submit', 'research',
      'train', 'practice', 'fix', 'finish', 'complete', 'launch',
    ],
    weight: 2,
  },
  lazy: {
    keywords: [
      'scroll', 'reels', 'netflix', 'tiktok', 'gaming', 'nap',
      'binge', 'instagram', 'drama', 'procrastinat', 'doomscroll',
      'meme', 'gossip', 'slack off',
    ],
    weight: 3,
  },
  avoidant: {
    // Actively skipping/avoiding productive behavior — special sub-category
    keywords: [
      'skip gym', 'skip workout', 'skip class', 'avoid', 'skip',
      'sleep again', 'sleep more', 'stay in bed',
    ],
    weight: 4, // very deliberate avoidance → stronger reaction
  },
  focus: {
    keywords: [
      'focus', 'deep work', 'meditation', 'yoga', 'breathe', 'no phone',
      'pomodoro', 'distraction free', 'offline',
    ],
    weight: 2,
  },
};

// ---------------------------------------------------------------------------
// CONTEXT QUALIFIERS
// Words that reduce a lazy score (user is using platform/topic professionally).
// If ANY qualifier is present alongside lazy keywords, halve the lazy score.
// WHY: "instagram marketing strategy" should NOT trigger a meme sound.
// ---------------------------------------------------------------------------
const PROFESSIONAL_QUALIFIERS = [
  'marketing', 'strategy', 'analytics', 'business', 'client',
  'campaign', 'content plan', 'analysis', 'report',
];

// ---------------------------------------------------------------------------
// NEGATION FLIP MAP
// "skip gym" → classify as avoidant even though 'gym' is productive
// We check for negation prefixes before applying productive scoring.
// ---------------------------------------------------------------------------
const NEGATION_PREFIXES = ['skip', 'avoid', 'cancel', "don't", 'no more'];

/**
 * Check if a title has a negation prefix before a productive keyword.
 * @param {string} lower - lowercased title
 * @returns {boolean}
 */
function hasNegatedProductiveIntent(lower) {
  return NEGATION_PREFIXES.some(prefix => lower.includes(prefix));
}

/**
 * Classify task title into a behavioral category using weighted scoring.
 * @param {string} title
 * @returns {'productive' | 'lazy' | 'avoidant' | 'focus' | 'neutral'}
 */
export function classifyTaskBehavior(title) {
  if (!title || typeof title !== 'string') return 'neutral';
  const lower = title.toLowerCase();

  const scores = {};

  for (const [category, { keywords, weight }] of Object.entries(BEHAVIOR_RULES)) {
    const matches = keywords.filter(kw => lower.includes(kw)).length;
    scores[category] = matches * weight;
  }

  // PROFESSIONAL QUALIFIER: if context suggests professional use, reduce lazy score
  const hasProfessionalQualifier = PROFESSIONAL_QUALIFIERS.some(q => lower.includes(q));
  if (hasProfessionalQualifier) {
    scores.lazy = Math.floor((scores.lazy || 0) / 2);
  }

  // NEGATION: if title negates a productive activity, suppress productive score
  if (hasNegatedProductiveIntent(lower)) {
    scores.productive = 0;
  }

  // Find the winning category
  let topCategory = 'neutral';
  let topScore    = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > topScore) {
      topScore    = score;
      topCategory = category;
    }
  }

  return topCategory;
}

// ---------------------------------------------------------------------------
// MEME SOUND KEY SELECTOR
// Maps behavioral context → specific meme catalog key.
// Uses title characteristics for intentional matching rather than random picks.
// ---------------------------------------------------------------------------

/**
 * Select the most appropriate meme sound key for a distraction/avoidant task.
 * @param {string} lower - lowercased title
 * @param {'lazy' | 'avoidant'} category
 * @returns {string} soundEngine catalog key
 */
function selectMemeKey(lower, category) {
  // Avoidant tasks get the 'fail' reaction — most emotionally appropriate
  if (category === 'avoidant') return 'meme_fail';

  // Specific keyword → specific meme sound for intentionality
  if (lower.includes('tiktok') || lower.includes('reels') || lower.includes('scroll')) return 'meme_bruh';
  if (lower.includes('nap')    || lower.includes('sleep') || lower.includes('procrastinat')) return 'meme_lazy';
  if (lower.includes('gaming') || lower.includes('binge') || lower.includes('netflix'))      return 'meme_troll';

  // Default lazy reaction
  return 'meme_sus';
}

// ---------------------------------------------------------------------------
// COMPANION RESPONSE SELECTOR
// ---------------------------------------------------------------------------
const promptIndexes = {}; // per-context rotation index

/**
 * Get the next companion message for a context, rotating through the pool.
 * @param {string} context - key in companionPrompts
 * @returns {string}
 */
export function getCompanionMessage(context) {
  const pool = companionPrompts[context] || companionPrompts.neutral;
  const last = promptIndexes[context] ?? -1;
  const { message, nextIndex } = pickMessage(pool, last);
  promptIndexes[context] = nextIndex;
  return message;
}

/**
 * Resolve companion context from task title + event type.
 * Handles 'create' event type for meme reaction companion messages.
 * @param {string} title
 * @param {'complete' | 'create'} eventType
 * @returns {string} context key for companionPrompts
 */
export function resolveCompanionContext(title, eventType) {
  const behavior = classifyTaskBehavior(title);

  if (eventType === 'create') {
    if (behavior === 'lazy' || behavior === 'avoidant') return 'onLazyCreate';
    return null; // no companion message for productive task creation
  }

  if (eventType === 'complete') {
    if (behavior === 'productive' || behavior === 'focus') return 'onProductiveComplete';
    if (behavior === 'lazy' || behavior === 'avoidant')   return 'onLazyComplete';
    return 'onProductiveComplete';
  }

  return 'neutral';
}

// ---------------------------------------------------------------------------
// SOUND CUE MAPPER
// Returns a soundEngine catalog key or null. Never returns raw filenames.
// ---------------------------------------------------------------------------

/**
 * Get the sound cue for a task event.
 * @param {string} title
 * @param {'complete' | 'create'} eventType
 * @returns {string | null} catalog key for SoundEngine.play()
 */
export function getSoundCue(title, eventType) {
  const behavior = classifyTaskBehavior(title);
  const lower    = (title || '').toLowerCase();

  // Task CREATION: only meme sounds fire on create (productive creates are silent)
  if (eventType === 'create') {
    if (behavior === 'lazy' || behavior === 'avoidant') {
      return selectMemeKey(lower, behavior);
    }
    return null; // productive/neutral creation: no sound (XP sound fires on complete)
  }

  // Task COMPLETION: reward sound based on what was accomplished
  if (eventType === 'complete') {
    return 'xp_gain'; // always play XP sound on completion; level_up fires separately
  }

  return null;
}

/**
 * Get the aura transition sound for a theme/mode event.
 * Called from App.jsx EventBus handlers.
 * @param {string} eventType - EventTypes key
 * @returns {string | null} catalog key
 */
export function getAuraSoundCue(eventType) {
  const AURA_SOUND_MAP = {
    FOCUS_MODE_ENTERED:      'aura_focus_shift',
    FOCUS_MODE_EXITED:       'aura_focus_shift',
    DISCIPLINE_MODE_ENTERED: 'aura_energy',
    DISCIPLINE_MODE_EXITED:  'aura_focus_shift',
  };
  return AURA_SOUND_MAP[eventType] || null;
}
