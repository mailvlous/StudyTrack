import { Router } from "express";
import { readDB } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { generateTaskPlan } from "../services/aiPlanner.js";

const router = Router();

router.use(requireAuth);

router.post("/task-plan", async (req, res) => {
  const { taskId } = req.body ?? {};

  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    return res.status(400).json({ error: "taskId harus berupa integer positif." });
  }

  let task;
  try {
    const db = readDB();
    task = db.tasks.find(
      (item) => item.id === taskId && item.user_id === req.user.id
    );
  } catch (error) {
    console.error("AI task plan database lookup failed:", error);
    return res.status(500).json({ error: "Gagal membaca data tugas." });
  }

  if (!task) {
    return res.status(404).json({ error: "Tugas tidak ditemukan." });
  }

  try {
    const plan = await generateTaskPlan(task);
    return res.json({ plan });
  } catch (error) {
    console.error("AI task plan generation failed:", error);
    return res.status(502).json({ error: "Gagal membuat rencana tugas." });
  }
});

export default router;
