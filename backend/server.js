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

export function createApp(env) {
  const app = express();

  app.locals.env = env;

  app.use(cors());
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
