// backend/services/progressionEngine.js
/**
 * Progression Engine – central authority for XP, streaks, penalties, and level decay.
 * All calculations are performed here to keep the frontend stateless.
 */

import Progression from '../models/progression.js';
import Task from '../models/task.js';
import { Logger } from '../utils/logger';

/**
 * Base XP values per priority (must match UI constants).
 */
export const PRIORITY_XP = {
  Low: 100,
  Normal: 150,
  High: 200,
  Elite: 250,
};

/**
 * Calculate the streak multiplier based on current streak days.
 * Caps at 30% after 25 days.
 * @param {number} streakDays
 * @returns {number} multiplier (e.g., 0.05 for +5%)
 */
export function getStreakMultiplier(streakDays) {
  if (streakDays <= 0) return 0;
  const multiplier = 0.05 + (streakDays - 1) * 0.01;
  return multiplier > 0.30 ? 0.30 : multiplier;
}

/**
 * Apply level decay logic after repeated failures.
 * Decay reduces XP gradually; recovery resets after successful completions.
 * @param {Progression} prog
 */
export async function applyDecayIfNeeded(prog) {
  if (prog.decayActive) {
    prog.xp -= prog.decayRate;
    if (prog.xp < 0) prog.xp = 0;
    prog.level = Math.floor(prog.xp / 1000) + 1;
    await prog.save();
    Logger.info('Decay applied', { xp: prog.xp, level: prog.level });
  }
}

/**
 * Process a completed task and return the XP reward and any messages.
 * Handles deadline bonus, streak multiplier, and level decay recovery.
 * @param {Task} task – the completed task document (already marked completed)
 * @param {Progression} prog – user's progression document
 * @returns {Object} { xpReward, messages }
 */
export async function handleTaskCompletion(task, prog) {
  // Base XP from priority
  const baseXP = PRIORITY_XP[task.priority] ?? PRIORITY_XP.Normal;
  let xp = baseXP;
  const messages = [];

  // Deadline bonus
  if (task.deadlineAt && new Date() < task.deadlineAt) {
    xp += 50;
    messages.push('ASCENSION BONUS ACQUIRED');
  }

  // Streak handling – ensure timezone‑consistent day comparison
  const now = new Date();
  const last = prog.lastCompletionDate ? new Date(prog.lastCompletionDate) : null;
  if (last) {
    const diffMs = now - last;
    // Two‑day window (48h) counts as consecutive
    if (diffMs <= 48 * 60 * 60 * 1000 && now.toDateString() !== last.toDateString()) {
      prog.streakDays += 1;
    } else if (now.toDateString() !== last.toDateString()) {
      prog.streakDays = 1;
      messages.push('STREAK RESET');
    }
  } else {
    prog.streakDays = 1;
  }
  prog.lastCompletionDate = now;

  // Apply streak multiplier
  const multiplier = getStreakMultiplier(prog.streakDays);
  if (multiplier > 0) {
    messages.push(`STREAK MULTIPLIER ACTIVE +${Math.round(multiplier * 100)}%`);
    xp = Math.round(xp * (1 + multiplier));
  }

  // Apply XP to progression
  prog.xp += xp;
  prog.level = Math.floor(prog.xp / 1000) + 1;

  // Reset decay if active – successful task counts toward recovery
  if (prog.decayActive) {
    prog.recoveryProgress += 1;
    if (prog.recoveryProgress >= 3) {
      prog.decayActive = false;
      prog.failureChain = 0;
      prog.decayRate = 0;
      prog.recoveryProgress = 0;
      messages.push('LEVEL STABILITY RESTORED');
    } else {
      messages.push(`RECOVERY IN PROGRESS (${prog.recoveryProgress}/3)`);
    }
  } else {
    prog.failureChain = 0;
  }

  await prog.save();
  Logger.info('Task completed – XP granted', { taskId: task._id, xpReward: xp, streak: prog.streakDays });
  return { xpReward: xp, messages };
}

/**
 * Process a task failure – apply penalty and possibly activate decay.
 * @param {Progression} prog
 * @param {number} failures – number of newly failed tasks
 */
export async function handleTaskFailure(prog, failures = 1) {
  prog.xp -= 100 * failures;
  if (prog.xp < 0) prog.xp = 0;
  prog.failureChain += failures;

  // Activate decay after three consecutive failures
  if (prog.failureChain >= 3 && !prog.decayActive) {
    prog.decayActive = true;
    prog.decayRate = 5; // XP per tick – can be tuned later
    prog.recoveryProgress = 0;
    Logger.warn('Level decay activated', { failureChain: prog.failureChain });
  }

  prog.level = Math.floor(prog.xp / 1000) + 1;
  await prog.save();
}

/**
 * Utility to sanitize rapid duplicate completions – ensure a task cannot be toggled
 * multiple times within a short window (e.g., 2 seconds).
 * @param {Task} task
 */
export function isDuplicateCompletion(task) {
  const now = Date.now();
  if (task.lastToggle && now - task.lastToggle < 2000) {
    return true;
  }
  task.lastToggle = now; // store a transient field (not persisted)
  return false;
}

export default {
  handleTaskCompletion,
  handleTaskFailure,
  applyDecayIfNeeded,
  getStreakMultiplier,
  PRIORITY_XP,
};
