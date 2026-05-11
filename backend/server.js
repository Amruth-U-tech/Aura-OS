import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import taskRoutes from "./routes/task_routes.js";
import cvRoutes from "./routes/cv_routes.js";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import morgan from "morgan";
import { globalLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.mongo_URI || "mongodb://localhost:27017/aura_os_dev";
const PORT = process.env.PORT || process.env.port || 5000;

if (!process.env.MONGO_URI && !process.env.mongo_URI) {
  console.warn("⚠️ Warning: MONGO_URI not found in .env, falling back to local database.");
}

mongoose
    .connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => {
        console.error("MongoDB Connection Error:", err);
        process.exit(1);
    });

const app = express();

// 1. Security Headers
app.use(helmet());

// 2. Logging
// 'dev' format uses ANSI color codes that appear as garbage in Render's
// plain-text log stream. 'combined' is the production-appropriate Apache format.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 3. Rate Limiting
app.use("/api/", globalLimiter);

// 4. CORS — restrict to the deployed frontend origin in production.
// In development, allow all origins for local tooling flexibility.
const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'https://aura-os.netlify.app';
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ALLOWED_ORIGIN : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Limit payload size to prevent DOS
app.use(express.json({ limit: '10kb' })); 

// 5. Data Sanitization (No-SQL Injection protection)
// Custom implementation to avoid 'Cannot set property query' crash in modern Express
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize.sanitize(req.body, { replaceWith: '_' });
  if (req.params) req.params = mongoSanitize.sanitize(req.params, { replaceWith: '_' });
  if (req.headers) req.headers = mongoSanitize.sanitize(req.headers, { replaceWith: '_' });
  // Safely skipping req.query because Express defines it as a getter-only property
  next();
});
app.use("/api/tasks", taskRoutes);
app.use("/api/cv", cvRoutes);

app.get("/", (req, res) => {
    res.send("Aura OS Backend Secure & Running");
});

// Handle undefined routes
app.use(notFoundHandler);

// Centralized Error Handling
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});