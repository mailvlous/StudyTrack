-- Migration number: 0001 	 2026-11-22T04:44:11.904Z

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  kode TEXT NOT NULL DEFAULT '',
  dosen TEXT NOT NULL DEFAULT '',
  UNIQUE (id, user_id),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mata_kuliah_id INTEGER NOT NULL,
  judul TEXT NOT NULL,
  deskripsi TEXT NOT NULL DEFAULT '',
  deadline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'belum'
    CHECK (status IN ('belum', 'selesai')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (mata_kuliah_id, user_id)
    REFERENCES courses (id, user_id) ON DELETE CASCADE
);

CREATE INDEX idx_courses_user_id ON courses (user_id);

CREATE INDEX idx_tasks_user_id_created_at ON tasks (user_id, created_at);

CREATE INDEX idx_tasks_user_id_mata_kuliah_id ON tasks (user_id, mata_kuliah_id);
