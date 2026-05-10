/**
 * AI Service Integration Layer (Production-Grade)
 *
 * Features:
 * - Cancellable AI operations via AbortController
 * - Safe promise wrapper for future streaming LLM responses
 * - Graceful failsafe defaults on cancellation or error
 *
 * WHY cancellable: AI inference calls can take 2–10s. If a component that
 *   triggered the call unmounts before completion, the resolved value would
 *   attempt to update destroyed state, causing memory leaks and stale renders.
 */
import { Logger } from "../utils/logger";

export const AIService = {
  /**
   * Analyze a task title and return suggested category + priority.
   * @param {string} title
   * @param {AbortSignal} [signal] — pass controller.signal for cancellation
   */
  analyzeTask: async (title, signal) => {
    return new Promise((resolve, reject) => {
      // Simulate async AI inference (swap with real API call later)
      const timer = setTimeout(() => {
        resolve({
          suggestedCategory:  'General',
          suggestedPriority:  'Medium',
          confidenceScore:    0.85,
        });
      }, 300);

      // CANCELLATION SUPPORT: if the caller aborts, clean up the timer
      // and reject with the AbortError so the caller can distinguish it.
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timer);
          Logger.info('AIService.analyzeTask — cancelled via AbortSignal');
          reject(new DOMException('AI task cancelled', 'AbortError'));
        }, { once: true });
      }
    }).catch(err => {
      // Propagate AbortError transparently; swallow all other errors with a safe default
      if (err.name === 'AbortError') throw err;
      Logger.error('AIService.analyzeTask failed', err);
      return { suggestedCategory: 'General', suggestedPriority: 'Medium', confidenceScore: 0 };
    });
  },

  /**
   * Behavioral analysis placeholder for future ML pipeline integration.
   * @param {Array} activityLogs
   * @param {AbortSignal} [signal]
   */
  analyzeBehavior: async (activityLogs, signal) => {
    Logger.info('AIService.analyzeBehavior requested', { logCount: activityLogs?.length ?? 0 });
    // Future: send to /api/ai/behavior, stream result via SSE
    return { status: 'ready' };
  }
};
