import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Seluruh endpoint mata kuliah membutuhkan login.
router.use(requireAuth);

/**
 * GET /api/courses
 * Daftar mata kuliah milik pengguna yang sedang login.
 *
 * Response : 200 { courses }
 */
router.get("/", async (req, res) => {
  const db = req.app.locals.env?.DB;
  if (!db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  try {
    const result = await db
      .prepare(
        `SELECT id, user_id, name, kode, dosen
         FROM courses
         WHERE user_id = ?
         ORDER BY id ASC`
      )
      .bind(req.user.id)
      .all();

    return res.json({ courses: result.results });
  } catch (error) {
    console.error("Courses list failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

/**
 * POST /api/courses
 * Menambahkan mata kuliah baru.
 *
 * Body     : { name, kode?, dosen? }
 * Response : 201 { course } | 400 name kosong
 */
router.post("/", async (req, res) => {
  const { name, kode, dosen } = req.body ?? {};
  if (!name) {
    return res.status(400).json({ error: "Nama mata kuliah wajib diisi." });
  }

  const db = req.app.locals.env?.DB;
  if (!db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  const course = {
    name,
    kode: kode || "",
    dosen: dosen || ""
  };

  try {
    const result = await db
      .prepare("INSERT INTO courses (user_id, name, kode, dosen) VALUES (?, ?, ?, ?)")
      .bind(req.user.id, course.name, course.kode, course.dosen)
      .run();

    return res.status(201).json({
      course: {
        id: result.meta.last_row_id,
        user_id: req.user.id,
        ...course
      }
    });
  } catch (error) {
    console.error("Course creation failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

/**
 * PUT /api/courses/:id
 * Memperbarui mata kuliah. Hanya field yang dikirim yang diubah.
 *
 * Body     : { name?, kode?, dosen? }
 * Response : 200 { course } | 404 tidak ditemukan
 */
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(404).json({ error: "Mata kuliah tidak ditemukan." });
  }

  const db = req.app.locals.env?.DB;
  if (!db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  try {
    const existing = await db
      .prepare(
        `SELECT id, user_id, name, kode, dosen
         FROM courses
         WHERE id = ? AND user_id = ?
         LIMIT 1`
      )
      .bind(id, req.user.id)
      .first();

    if (!existing) {
      return res.status(404).json({ error: "Mata kuliah tidak ditemukan." });
    }

    const { name, kode, dosen } = req.body;
    const course = {
      name: name !== undefined ? name : existing.name,
      kode: kode !== undefined ? kode : existing.kode,
      dosen: dosen !== undefined ? dosen : existing.dosen
    };

    const result = await db
      .prepare("UPDATE courses SET name = ?, kode = ?, dosen = ? WHERE id = ? AND user_id = ?")
      .bind(course.name, course.kode, course.dosen, id, req.user.id)
      .run();

    if (result.meta.changes === 0) {
      return res.status(404).json({ error: "Mata kuliah tidak ditemukan." });
    }

    return res.json({
      course: {
        id: existing.id,
        user_id: existing.user_id,
        ...course
      }
    });
  } catch (error) {
    console.error("Course update failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

/**
 * DELETE /api/courses/:id
 * Menghapus mata kuliah beserta seluruh tugas di dalamnya.
 *
 * Response : 200 { success: true } | 404 tidak ditemukan
 */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(404).json({ error: "Mata kuliah tidak ditemukan." });
  }

  const db = req.app.locals.env?.DB;
  if (!db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  try {
    const result = await db
      .prepare("DELETE FROM courses WHERE id = ? AND user_id = ?")
      .bind(id, req.user.id)
      .run();

    if (result.meta.changes === 0) {
      return res.status(404).json({ error: "Mata kuliah tidak ditemukan." });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("Course deletion failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

export default router;
