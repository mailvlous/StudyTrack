import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

/**
 * Mendeteksi pelanggaran UNIQUE pada kolom email saat insert, termasuk yang
 * terjadi karena race condition setelah pengecekan awal.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
function isDuplicateEmailError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /unique constraint failed: users\.email/i.test(message);
}

/**
 * Membuat JWT yang berlaku 7 hari untuk pengguna.
 *
 * @param {{ id: number, nama: string, email: string }} user
 * @param {string} jwtSecret
 * @returns {string} Token JWT.
 */
function signToken(user, jwtSecret) {
  return jwt.sign(
    { sub: user.id, nama: user.nama, email: user.email },
    jwtSecret,
    { expiresIn: "7d" }
  );
}

/**
 * POST /api/auth/register
 * Mendaftarkan akun baru, lalu langsung mengembalikan token login.
 *
 * Body     : { nama, email, password } (password minimal 6 karakter)
 * Response : 201 { token, user } | 400 input tidak valid | 409 email sudah terdaftar
 */
router.post("/register", async (req, res) => {
  const { nama, email, password } = req.body;

  if (!nama || !email || !password) {
    return res.status(400).json({ error: "Nama, email, dan password wajib diisi." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password minimal 6 karakter." });
  }

  const jwtSecret = req.app.locals.env?.JWT_SECRET;
  const db = req.app.locals.env?.DB;
  if (!jwtSecret || !db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  try {
    const existing = await db
      .prepare("SELECT id FROM users WHERE email = ? LIMIT 1")
      .bind(email)
      .first();

    if (existing) {
      return res.status(409).json({ error: "Email sudah terdaftar." });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await db
      .prepare("INSERT INTO users (nama, email, password_hash) VALUES (?, ?, ?)")
      .bind(nama, email, passwordHash)
      .run();

    const newUser = { id: result.meta.last_row_id, nama, email };
    const token = signToken(newUser, jwtSecret);

    return res.status(201).json({ token, user: newUser });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return res.status(409).json({ error: "Email sudah terdaftar." });
    }

    console.error("Auth register failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

/**
 * POST /api/auth/login
 * Memverifikasi email dan password, lalu mengembalikan token login.
 *
 * Body     : { email, password }
 * Response : 200 { token, user } | 400 input kosong | 401 email atau password salah
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password wajib diisi." });
  }

  const jwtSecret = req.app.locals.env?.JWT_SECRET;
  const db = req.app.locals.env?.DB;
  if (!jwtSecret || !db) {
    return res.status(500).json({ error: "Konfigurasi server tidak lengkap." });
  }

  try {
    const user = await db
      .prepare("SELECT id, nama, email, password_hash FROM users WHERE email = ? LIMIT 1")
      .bind(email)
      .first();

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Email atau password salah." });
    }

    const token = signToken(user, jwtSecret);
    return res.json({
      token,
      user: { id: user.id, nama: user.nama, email: user.email }
    });
  } catch (error) {
    console.error("Auth login failed:", error);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

/**
 * GET /api/auth/me
 * Mengembalikan profil pengguna dari token yang sedang dipakai.
 *
 * Response : 200 { user } | 401 token tidak ada atau tidak valid
 */
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
