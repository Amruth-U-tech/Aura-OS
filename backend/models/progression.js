import mongoose from "mongoose";

const progressionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: "default_user",
      unique: true,
    },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streakDays: { type: Number, default: 0 },
    lastCompletionDate: { type: Date, default: null },
    decayActive: { type: Boolean, default: false },
    decayRate: { type: Number, default: 0 },
    failureChain: { type: Number, default: 0 },
    recoveryProgress: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Progression", progressionSchema);
