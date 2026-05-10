import express from "express";
import { startExercise } from "../controllers/cv_controller.js";

const router = express.Router();

router.post("/start", startExercise);

export default router;
