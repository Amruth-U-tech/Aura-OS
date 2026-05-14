import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Timestamp of the last completion toggle (used for anti-abuse duplicate detection)
    lastToggle: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Elite"],
      default: "Normal",
    },
    category: {
      type: String,
      enum: ["Work", "Personal", "Health", "Study", "General"],
      default: "General",
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    deadlineType: {
      type: String,
      enum: ["None", "Hours", "ExactTime"],
      default: "Hours",
    },
    deadlineValue: {
      type: String,
      default: "",
    },
    deadlineAt: {
      type: Date,
      default: null,
    },
    failed: {
      type: Boolean,
      default: false,
    },
    failureNotified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

export default mongoose.model("Task", taskSchema);