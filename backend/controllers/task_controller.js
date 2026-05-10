import Task from "../models/task.js";
import { detectCategory, detectPriority } from "../utils/ai_helpers.js";

// @desc    Get all tasks with filtering
// @route   GET /api/tasks
export const getTasks = async (req, res) => {
  try {
    const { completed, category, priority } = req.query;
    
    let query = {};
    if (completed !== undefined) query.completed = completed === 'true';
    if (category) query.category = category;
    if (priority) query.priority = priority;

    let tasks = await Task.find(query).sort({ createdAt: -1 });

    // Check for failed tasks
    const now = new Date();
    let tasksUpdated = false;
    for (let task of tasks) {
      if (!task.completed && !task.failed && task.deadlineAt && task.deadlineAt < now) {
        task.failed = true;
        await task.save();
        tasksUpdated = true;
      }
    }

    if (tasksUpdated) {
      tasks = await Task.find(query).sort({ createdAt: -1 });
    }

    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tasks", error: error.message });
  }
};

// @desc    Create a task
// @route   POST /api/tasks
export const createTask = async (req, res) => {
  try {
    const { title, deadlineType, deadlineValue } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: "Task title is required" });
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
      deadlineType: deadlineType || "None",
      deadlineValue: deadlineValue || "",
      deadlineAt
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: "Error creating task", error: error.message });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Acknowledge failure
    if (updateData.failureNotified) {
      task.failureNotified = true;
    }
    
    Object.assign(task, updateData);
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: "Error updating task", error: error.message });
  }
};

// @desc    Toggle task completion
// @route   PATCH /api/tasks/:id/toggle
export const toggleTaskCompletion = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    task.completed = !task.completed;
    await task.save();

    res.status(200).json(task);
  } catch (error) {
    res.status(500).json({ message: "Error toggling task completion", error: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task", error: error.message });
  }
};
