/**
 * AI Companion Prompt Pools
 * Concise, emotionally intelligent message banks keyed by behavioral context.
 *
 * Design principles:
 * - Short (max 6 words per message)
 * - Human-sounding, not corporate
 * - Non-repetitive within a session (caller rotates index)
 * - Context-aware, not generic motivational spam
 */

export const companionPrompts = {
  /** User completing tasks productively */
  onProductiveComplete: [
    "That's the energy.",
    "Keep that momentum.",
    "Building something real.",
    "One less thing holding you back.",
    "Discipline looks good on you.",
  ],

  /** User completing a suspicious/lazy task */
  onLazyComplete: [
    "You sure that counted?",
    "Bold move. Respect, I guess.",
    "At least you did something.",
    "...okay then.",
  ],

  /** User CREATING a distraction task (sounds before completion) */
  onLazyCreate: [
    "That really helping your future?",
    "Interesting choice.",
    "You sure about that one?",
    "Bold. Questionable, but bold.",
  ],

  /** User entering Focus Mode */
  onFocusEnter: [
    "Let's lock in.",
    "No distractions. Just you.",
    "This is where growth happens.",
    "Full focus mode. Let's go.",
  ],

  /** User exiting Focus Mode */
  onFocusExit: [
    "Good session.",
    "Take a breath. You earned it.",
    "Rest is part of the system.",
  ],

  /** User has been inactive (no tasks for a while) */
  onInactivity: [
    "Still here when you're ready.",
    "Small progress still counts.",
    "Even one task changes the day.",
    "Start with the smallest thing.",
  ],

  /** Level-up event */
  onLevelUp: [
    "Level up. You're evolving.",
    "New level. Same discipline needed.",
    "Growth is showing.",
  ],

  /** High streak */
  onStreak: [
    "You're on a streak. Don't break it.",
    "Momentum is rare. Protect it.",
    "This version of you is different.",
  ],

  /** Entering discipline mode */
  onDisciplineEnter: [
    "Mission started. No excuses.",
    "This is the hard part. Do it anyway.",
    "Locked in.",
  ],

  /** Generic neutral acknowledgment */
  neutral: [
    "Noted.",
    "I see you.",
    "Still with you.",
  ],
};

/**
 * Pick a non-repeating message from a pool.
 * Uses a simple index rotation to avoid same-message repetition.
 * @param {string[]} pool - message array
 * @param {number} lastIndex - previous index used
 * @returns {{ message: string, nextIndex: number }}
 */
export function pickMessage(pool, lastIndex = -1) {
  if (!pool || pool.length === 0) return { message: '', nextIndex: 0 };
  // Avoid repeating the exact same index
  let nextIndex = (lastIndex + 1) % pool.length;
  return { message: pool[nextIndex], nextIndex };
}
