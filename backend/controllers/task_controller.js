import Task from "../models/task.js";
import Progression from "../models/progression.js";
import { detectCategory, detectPriority } from "../utils/ai_helpers.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import progressionEngine from "../services/progressionEngine.js";
import { EventBus, EventTypes } from "../events/eventBus.js";

// @desc    Get all tasks with filtering
// @route   GET /api/tasks
export const getTasks = asyncHandler(async (req, res) => {
  const { completed, category, priority } = req.query;
  
  let query = {};
  if (completed !== undefined) query.completed = completed === 'true';
  if (category) query.category = category;
  if (priority) query.priority = priority;

  let tasks = await Task.find(query).sort({ createdAt: -1 });

  let progression = await Progression.findOne({ userId: "default_user" });
  if (!progression) {
    progression = await Progression.create({});
  }

  // Check for failed tasks
  const now = new Date();
  let newlyFailed = 0;
  for (let task of tasks) {
    if (!task.completed && !task.failed && task.deadlineAt && task.deadlineAt < now) {
      task.failed = true;
      await task.save();
      newlyFailed++;
    }
  }

  if (newlyFailed > 0) {
    // Use progressionEngine to apply penalty and decay logic
    await progressionEngine.handleTaskFailure(progression, newlyFailed);
  } else if (progression.decayActive) {
    // Apply periodic decay
    await progressionEngine.applyDecayIfNeeded(progression);
  }

  // Refresh tasks after updates
  if (newlyFailed > 0) {
    tasks = await Task.find(query).sort({ createdAt: -1 });
  }

  sendSuccess(res, { tasks, progression });
});

// @desc    Create a task
// @route   POST /api/tasks
export const createTask = asyncHandler(async (req, res) => {
  const { title, deadlineType, deadlineValue } = req.body;
  
  // Validation middleware already ensures title exists, but we keep this just in case
  if (!title) {
    return sendError(res, "Task title is required", "VALIDATION_ERROR", 400);
  }

  // AI suggestions
  const category = detectCategory(title);
  const priority = detectPriority(title);

  let deadlineAt = null;
  if (deadlineType === "Hours" && deadlineValue) {
    deadlineAt = new Date(Date.now() + Number(deadlineValue) * 3600000);
  } else if (deadlineType === "ExactTime" && deadlineValue) {
    // Parse exact time (HH:MM) assuming today
    const now = new Date();
    const [hours, minutes] = deadlineValue.split(':').map(Number);
    deadlineAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    // If time has already passed today, set it for tomorrow
    if (deadlineAt < now) {
      deadlineAt.setDate(deadlineAt.getDate() + 1);
    }
  }

  const task = await Task.create({
    title,
    category,
    priority,
    deadlineType,
    deadlineValue,
    deadlineAt
  });

  sendSuccess(res, task, 201);
});

// @desc    Update a task
// @route   PUT /api/tasks/:id
export const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const task = await Task.findById(id);
  if (!task) {
    return sendError(res, "Task not found", "NOT_FOUND", 404);
  }

  // Acknowledge failure
  if (updateData.failureNotified) {
    task.failureNotified = true;
  }
  
  Object.assign(task, updateData);
  await task.save();

  sendSuccess(res, task);
});

// @desc    Toggle task completion
// @route   PATCH /api/tasks/:id/toggle
export const toggleTaskCompletion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await Task.findById(id);

  if (!task) {
    return sendError(res, "Task not found", "NOT_FOUND", 404);
  }

  // Toggle task completion using progression engine
  const progression = await Progression.findOne({ userId: "default_user" }) || await Progression.create({});

  // Check for duplicate rapid toggles
  if (progressionEngine.isDuplicateCompletion(task)) {
      return sendError(res, "Duplicate completion detected", "DUPLICATE_ERROR", 429);
  }

  // Toggle task completion using progression engine
  if (!task.completed) {
      task.completed = true;
      await task.save();
      const { xpReward, messages } = await progressionEngine.handleTaskCompletion(task, progression);
      // Dispatch events for UI and sound
      EventBus.dispatch('PROGRESSION_UPDATED', { progression });
      EventBus.dispatch(EventTypes.XP_GAINED, { xp: xpReward, messages });
      sendSuccess(res, { task, progression, event: { xpReward, messages } });
  } else {
      task.completed = false;
      await task.save();
      sendSuccess(res, { task, progression });
  }
  await progression.save();
  return;
});

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
export const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await Task.findByIdAndDelete(id);

  if (!task) {
    return sendError(res, "Task not found", "NOT_FOUND", 404);
  }

  sendSuccess(res, { message: "Task deleted successfully" });
});
