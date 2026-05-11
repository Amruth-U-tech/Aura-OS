/**
 * API Service (Final Production-Grade)
 *
 * Features:
 * - Environment-based API URL via import.meta.env.VITE_API_URL
 * - AbortController-based request cancellation (prevents stale state updates)
 * - Response validation via validateTaskArray/validateTaskPayload
 * - Global error interception with EventBus notification
 * - Clean service interface preserving existing API surface
 * - Safe fallback to production Render backend if env var is missing
 *
 * WHY cancellation: When a component unmounts mid-flight (e.g., navigating away
 *   from the dashboard while tasks are loading), the async callback can still
 *   call setTasks() on a destroyed component, causing React memory leak warnings
 *   and potentially corrupted state in adjacent still-mounted components.
 *
 * ENV VARIABLES (set in .env / .env.production / Vercel dashboard):
 *   VITE_API_URL — full base URL for the API, e.g. https://aura-os-d88w.onrender.com/api
 */
import axios from "axios";
import { Logger } from "../utils/logger";
import { EventBus, EventTypes } from "../events/eventBus";
import { validateTaskPayload, validateTaskArray } from "../utils/validation";

// ---------------------------------------------------------------------------
// Resolve API base URL from Vite environment at build time.
// Priority:  VITE_API_URL  →  production Render fallback
// ---------------------------------------------------------------------------
const PRODUCTION_FALLBACK = "https://aura-os-d88w.onrender.com/api";

const resolveApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;

  if (!envUrl) {
    // Only surface this warning in dev/debug mode; never crashes the app.
    if (import.meta.env.VITE_DEBUG === "true" || import.meta.env.DEV) {
      console.warn(
        "[API] VITE_API_URL is not set. Falling back to production Render backend:",
        PRODUCTION_FALLBACK
      );
    }
    return PRODUCTION_FALLBACK;
  }

  if (import.meta.env.VITE_DEBUG === "true" || import.meta.env.DEV) {
    console.log("[API] Using backend:", envUrl);
  }

  return envUrl;
};

const API_BASE_URL = resolveApiBaseUrl();

// Shared Axios instance with a safe timeout
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Global response interceptor
api.interceptors.response.use(
  response => {
    Logger.info('[API] Raw backend response:', response.data);
    
    // Robustly unwrap standard backend responses: { success: true, data: ... }
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      response.data = response.data.data;
      Logger.info('[API] Normalized payload:', response.data);
    }
    
    return response;
  },
  error => {
    // Don't log or dispatch for intentional cancellations
    if (axios.isCancel(error)) {
      Logger.info('Request cancelled (component unmounted or superseded)');
      return Promise.reject(error);
    }
    Logger.error('API request failed', error);
    EventBus.dispatch(EventTypes.ERROR_OCCURRED, { message: 'Network error occurred' });
    return Promise.reject(error);
  }
);

export const APIService = {
  /**
   * Fetch all tasks.
   * @param {AbortSignal} signal — pass controller.signal from the calling component
   */
  getTasks: async (signal) => {
    try {
      const response = await api.get('/tasks', { signal });
      // RESPONSE VALIDATION: filter out any malformed documents before they enter state
      return validateTaskArray(response.data);
    } catch (error) {
      if (!axios.isCancel(error)) Logger.error('getTasks failed', error);
      return []; // Safe empty fallback
    }
  },

  /**
   * Create a new task.
   * @param {string} title
   * @param {string} deadlineType
   * @param {string} deadlineValue
   * @param {AbortSignal} [signal]
   */
  createTask: async (title, deadlineType, deadlineValue, signal) => {
    const response = await api.post('/tasks', { title, deadlineType, deadlineValue }, { signal });
    // Validate the newly created task before injecting into state
    if (!validateTaskPayload(response.data)) {
      throw new Error('Server returned an invalid task object after creation');
    }
    EventBus.dispatch(EventTypes.TASK_CREATED, { task: response.data });
    return response.data;
  },

  /**
   * Toggle task completion.
   * @param {string} id
   * @param {AbortSignal} [signal]
   */
  toggleTask: async (id, signal) => {
    const response = await api.patch(`/tasks/${id}/toggle`, {}, { signal });
    if (!validateTaskPayload(response.data)) {
      throw new Error('Server returned an invalid task object after toggle');
    }
    if (response.data.completed) {
      EventBus.dispatch(EventTypes.TASK_COMPLETED, { task: response.data });
      EventBus.dispatch(EventTypes.XP_GAINED, { amount: 10 });
    }
    return response.data;
  },

  deleteTask: async (id, signal) => {
    try {
      await api.delete(`/tasks/${id}`, { signal });
      EventBus.dispatch(EventTypes.TASK_DELETED, { id });
      return true;
    } catch (error) {
      if (!axios.isCancel(error)) Logger.error('deleteTask failed', error);
      return false;
    }
  },

  /**
   * Update a task (e.g., acknowledge failure).
   * @param {string} id
   * @param {Object} data
   * @param {AbortSignal} [signal]
   */
  updateTask: async (id, data, signal) => {
    const response = await api.put(`/tasks/${id}`, data, { signal });
    if (!validateTaskPayload(response.data)) {
      throw new Error('Server returned an invalid task object after update');
    }
    return response.data;
  },

  /**
   * Start OpenCV Exercise.
   * @param {string} exercise (pushups, situps, squats)
   * @param {number} reps
   */
  startCVExercise: async (exercise, reps) => {
    try {
      const response = await api.post(`/cv/start`, { exercise, reps });
      return response.data;
    } catch (error) {
      Logger.error(`CV Exercise failed: ${exercise}`, error);
      throw error;
    }
  }
};
