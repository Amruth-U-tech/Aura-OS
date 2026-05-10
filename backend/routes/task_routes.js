import express from "express";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion
} from "../controllers/task_controller.js";
import { validateTaskPayload } from "../middleware/validate.js";

const router = express.Router();

router.route("/")
  .get(getTasks)
  .post(validateTaskPayload, createTask);

router.route("/:id")
  .put(validateTaskPayload, updateTask)
  .delete(deleteTask);

router.patch("/:id/toggle", toggleTaskCompletion);

export default router;