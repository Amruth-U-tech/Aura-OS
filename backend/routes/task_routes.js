import express from "express";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion
} from "../controllers/task_controller.js";

const router = express.Router();

router.route("/")
  .get(getTasks)
  .post(createTask);

router.route("/:id")
  .put(updateTask)
  .delete(deleteTask);

router.patch("/:id/toggle", toggleTaskCompletion);

export default router;