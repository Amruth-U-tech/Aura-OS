import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
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
    deadlineType: {
      type: String,
      enum: ["None", "Hours", "ExactTime"],
      default: "None",
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