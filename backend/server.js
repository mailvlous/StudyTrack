/**
 * Express app backend StudyTrack.
 *
 * Membuat app Express dengan seluruh route. Entry point runtime (Node lokal
 * atau Cloudflare Workers) bertanggung jawab menjalankan app ini.
 */
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import taskRoutes from "./routes/tasks.js";
import aiRoutes from "./routes/ai.js";

/** Origin frontend production bila `FRONTEND_ORIGIN` tidak diset. */
const DEFAULT_FRONTEND_ORIGIN = "https://studytrack-frontend.pages.dev";

/** Origin development lokal yang selalu diizinkan. */
const LOCAL_DEV_ORIGINS = ["http://localhost:5173"];

function getAllowedOrigins(env) {
  const origins = new Set(LOCAL_DEV_ORIGINS);
  origins.add(env?.FRONTEND_ORIGIN || DEFAULT_FRONTEND_ORIGIN);

  // Origin tambahan (misalnya domain custom) lewat env, dipisahkan koma.
  if (env?.CORS_ORIGINS) {
    for (const origin of env.CORS_ORIGINS.split(",")) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  return origins;
}

export function createApp(env) {
  const app = express();

  app.locals.env = env;

  const allowedOrigins = getAllowedOrigins(env);

  app.use(
    cors({
      origin(origin, callback) {
        // Request tanpa Origin (same-origin, curl, health check) tetap dilayani.
        callback(null, !origin || allowedOrigins.has(origin));
      }
    })
  );
  app.use(express.json());

  // GET /api/health - cek apakah server sedang berjalan
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "StudyTrack backend is running." });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/ai", aiRoutes);

  // Fallback untuk endpoint yang tidak terdaftar
  app.use((req, res) => {
    res.status(404).json({ error: "Endpoint tidak ditemukan." });
  });

  return app;
}
