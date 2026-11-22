import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { generateTaskPlan } from "../services/aiPlanner.js";

const router = Router();

router.use(requireAuth);

router.post("/task-plan", async (req, res) => {
  const { taskId } = req.body ?? {};

  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    return res.status(400).json({ error: "taskId harus berupa integer positif." });
  }

  const env = req.app.locals.env;
  const db = env?.DB;
  if (!db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  let task;
  try {
    task = await db
      .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ? LIMIT 1")
      .bind(taskId, req.user.id)
      .first();
  } catch (error) {
    console.error("AI task plan database lookup failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }

  if (!task) {
    return res.status(404).json({ error: "Tugas tidak ditemukan." });
  }

  try {
    const plan = await generateTaskPlan(task, env);
    return res.json({ plan });
  } catch (error) {
    console.error("AI task plan generation failed:", error);
    return res.status(502).json({ error: "Gagal membuat rencana tugas." });
  }
});

export default router;
