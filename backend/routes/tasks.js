import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { parseLocalDeadline, determineDeadlineCategory } from "../utils/deadline.js";

const router = Router();

// Seluruh endpoint tugas membutuhkan login.
router.use(requireAuth);

/**
 * GET /api/tasks
 * Daftar seluruh tugas milik pengguna yang sedang login, lintas semua mata
 * kuliah. Setiap tugas menyertakan `mata_kuliah` (nama mata kuliahnya).
 *
 * Urutan: tugas approaching di atas, kemudian created_at terbaru.
 *
 * Response : 200 { tasks }
 */
router.get("/", async (req, res) => {
  const db = req.app.locals.env?.DB;
  if (!db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  try {
    const result = await db
      .prepare(
        `SELECT
           t.id,
           t.user_id,
           t.mata_kuliah_id,
           t.judul,
           t.deskripsi,
           t.deadline,
           t.status,
           t.created_at,
           c.name AS mata_kuliah
         FROM tasks AS t
         LEFT JOIN courses AS c
           ON c.id = t.mata_kuliah_id
           AND c.user_id = t.user_id
         WHERE t.user_id = ?`
      )
      .bind(req.user.id)
      .all();

    const now = new Date();

    const tasks = result.results
      .map((task) => {
        const parsedDeadline = parseLocalDeadline(task.deadline);
        const deadlineCategory = parsedDeadline
          ? determineDeadlineCategory(parsedDeadline, now)
          : null;

        return { ...task, deadline_category: deadlineCategory };
      })
      .sort((a, b) => {
        const priorityDifference =
          (a.deadline_category === "approaching" ? 0 : 1) -
          (b.deadline_category === "approaching" ? 0 : 1);

        return priorityDifference || new Date(b.created_at) - new Date(a.created_at);
      });

    return res.json({ tasks });
  } catch (error) {
    console.error("Tasks list failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

/**
 * GET /api/tasks/:id
 * Detail satu tugas milik pengguna yang sedang login.
 *
 * Response : 200 { task } | 404 tidak ditemukan
 */
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(404).json({ error: "Tugas tidak ditemukan." });
  }

  const db = req.app.locals.env?.DB;
  if (!db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  try {
    const task = await db
      .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ? LIMIT 1")
      .bind(id, req.user.id)
      .first();

    if (!task) {
      return res.status(404).json({ error: "Tugas tidak ditemukan." });
    }

    return res.json({ task });
  } catch (error) {
    console.error("Task detail failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

/**
 * POST /api/tasks
 * Menambahkan tugas baru dengan status awal "belum".
 *
 * Body     : { mata_kuliah_id, judul, deadline, deskripsi? }
 * Response : 201 { task } | 400 input tidak valid atau mata kuliah bukan milik user
 */
router.post("/", async (req, res) => {
  const { mata_kuliah_id, judul, deskripsi, deadline } = req.body ?? {};
  if (!mata_kuliah_id || !judul || !deadline) {
    return res.status(400).json({ error: "mata_kuliah_id, judul, dan deadline wajib diisi." });
  }

  const db = req.app.locals.env?.DB;
  if (!db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  const task = {
    user_id: req.user.id,
    mata_kuliah_id: Number(mata_kuliah_id),
    judul,
    deskripsi: deskripsi || "",
    deadline,
    status: "belum",
    created_at: new Date().toISOString()
  };

  try {
    const result = await db
      .prepare(
        `INSERT INTO tasks (
           user_id,
           mata_kuliah_id,
           judul,
           deskripsi,
           deadline,
           status,
           created_at
         )
         SELECT ?, id, ?, ?, ?, 'belum', ?
         FROM courses
         WHERE id = ? AND user_id = ?`
      )
      .bind(
        task.user_id,
        task.judul,
        task.deskripsi,
        task.deadline,
        task.created_at,
        task.mata_kuliah_id,
        task.user_id
      )
      .run();

    if (result.meta.changes === 0) {
      return res.status(400).json({ error: "Mata kuliah tidak ditemukan untuk user ini." });
    }

    return res.status(201).json({
      task: { id: result.meta.last_row_id, ...task }
    });
  } catch (error) {
    console.error("Task creation failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

/**
 * PUT /api/tasks/:id
 * Memperbarui tugas, termasuk mengubah status. Hanya field yang dikirim yang
 * diubah.
 *
 * Body     : { judul?, deskripsi?, deadline?, status? } (status: "belum" | "selesai")
 * Response : 200 { task } | 400 status tidak valid | 404 tidak ditemukan
 */
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(404).json({ error: "Tugas tidak ditemukan." });
  }

  const db = req.app.locals.env?.DB;
  if (!db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  const { judul, deskripsi, deadline, status } = req.body ?? {};

  try {
    const existing = await db
      .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ? LIMIT 1")
      .bind(id, req.user.id)
      .first();

    if (!existing) {
      return res.status(404).json({ error: "Tugas tidak ditemukan." });
    }

    if (status !== undefined && !["belum", "selesai"].includes(status)) {
      return res.status(400).json({ error: "Status hanya boleh 'belum' atau 'selesai'." });
    }

    const task = {
      judul: judul !== undefined ? judul : existing.judul,
      deskripsi: deskripsi !== undefined ? deskripsi : existing.deskripsi,
      deadline: deadline !== undefined ? deadline : existing.deadline,
      status: status !== undefined ? status : existing.status
    };

    const result = await db
      .prepare(
        `UPDATE tasks
         SET judul = ?, deskripsi = ?, deadline = ?, status = ?
         WHERE id = ? AND user_id = ?`
      )
      .bind(task.judul, task.deskripsi, task.deadline, task.status, id, req.user.id)
      .run();

    if (result.meta.changes === 0) {
      return res.status(404).json({ error: "Tugas tidak ditemukan." });
    }

    return res.json({
      task: {
        id: existing.id,
        user_id: existing.user_id,
        mata_kuliah_id: existing.mata_kuliah_id,
        created_at: existing.created_at,
        ...task
      }
    });
  } catch (error) {
    console.error("Task update failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

/**
 * DELETE /api/tasks/:id
 * Menghapus satu tugas.
 *
 * Response : 200 { success: true } | 404 tidak ditemukan
 */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(404).json({ error: "Tugas tidak ditemukan." });
  }

  const db = req.app.locals.env?.DB;
  if (!db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  try {
    const result = await db
      .prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?")
      .bind(id, req.user.id)
      .run();

    if (result.meta.changes === 0) {
      return res.status(404).json({ error: "Tugas tidak ditemukan." });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Task deletion failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

export default router;
