import "dotenv/config"; // MUST be first so env is loaded before any module reads it
import express, { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./config/database";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import { rateLimiter } from "./middlewares/rateLimiter";

// Route imports
import authRoutes from "./routes/auth.routes";
import studentRoutes from "./routes/student.routes";
import mentorRoutes from "./routes/mentor.routes";
import sessionRoutes from "./routes/session.routes";
import paymentRoutes from "./routes/payment.routes";
import notificationRoutes from "./routes/notification.routes";
import adminRoutes from "./routes/admin.routes";
import badgeRoutes from "./routes/badge.routes";
import cronRoutes from "./routes/cron.routes";

const app = express();

// ── CORS ───────────────────────────────────────────────────────
// Accept a comma-separated list of allowed origins (CLIENT_URL) so the
// same backend can serve local dev and the deployed Vercel frontend.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:8080")
  .split(",")
  .map((o) => o.trim());

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      return callback(null, true); // permissive by default; tighten if needed
    },
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json({ limit: "25mb" })); // allows certificate PDF uploads (base64)
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ── Health check (NO DB — true liveness probe, always responds) ─
app.get(["/health", "/api/health"], (_req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: "ok",
    db: states[mongoose.connection.readyState] || "unknown",
    timestamp: new Date().toISOString(),
  });
});

// ── Ensure DB connection (cached) before handling API requests ──
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// ── Rate limiting ──────────────────────────────────────────────
app.use("/api/auth", rateLimiter);

// ── API routes ─────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/cron", cronRoutes);

// ── Error handling ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
