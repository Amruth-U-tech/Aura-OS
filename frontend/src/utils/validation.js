/**
 * Validation Helpers (Production-Grade)
 *
 * WHY: Trusting API responses blindly is a critical failure mode.
 *      Malformed backend payloads must be caught at the boundary
 *      before they corrupt React state or cause rendering crashes.
 *
 * Design: Validators return boolean. Callers decide how to react.
 *         This keeps validation logic reusable and pure.
 */
import { Logger } from "./logger";

// ---------------------------------------------------------------------------
// VALID ENUM SETS — single source of truth matching backend model enums
// ---------------------------------------------------------------------------
const VALID_PRIORITIES = new Set(['Low', 'Medium', 'High']);
const VALID_CATEGORIES = new Set(['Work', 'Personal', 'Health', 'Study', 'General']);

// ---------------------------------------------------------------------------
// INDIVIDUAL FIELD VALIDATORS
// ---------------------------------------------------------------------------
const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

const isBoolean = (value) => typeof value === 'boolean';

// ---------------------------------------------------------------------------
// TASK PAYLOAD VALIDATOR
// WHY: Catches malformed API responses early.
//      Prevents undefined._id crashes, NaN renders, and enum violations.
// ---------------------------------------------------------------------------
export const validateTaskPayload = (task) => {
  if (!task || typeof task !== 'object') {
    Logger.warn('Invalid task: not an object', { task });
    return false;
  }
  if (!isNonEmptyString(task._id)) {
    Logger.warn('Invalid task: missing _id', { task });
    return false;
  }
  if (!isNonEmptyString(task.title)) {
    Logger.warn('Invalid task: missing or empty title', { task });
    return false;
  }
  if (!isBoolean(task.completed)) {
    Logger.warn('Invalid task: completed is not boolean', { task });
    return false;
  }
  if (!VALID_PRIORITIES.has(task.priority)) {
    Logger.warn('Invalid task: unknown priority', { priority: task.priority });
    return false;
  }
  if (!VALID_CATEGORIES.has(task.category)) {
    Logger.warn('Invalid task: unknown category', { category: task.category });
    return false;
  }
  return true;
};

// ---------------------------------------------------------------------------
// TASK ARRAY VALIDATOR
// Filters an array response from the API, removing any invalid entries.
// WHY: A single bad document from MongoDB must not crash the entire list.
// ---------------------------------------------------------------------------
export const validateTaskArray = (data) => {
  if (!Array.isArray(data)) {
    Logger.error('Expected task array from API, received:', data);
    return [];
  }
  return data.filter(validateTaskPayload);
};

// ---------------------------------------------------------------------------
// SAFE JSON PARSE
// ---------------------------------------------------------------------------
export const safeJSONParse = (jsonString, fallback = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    Logger.error('JSON Parse Error', error);
    return fallback;
  }
};
