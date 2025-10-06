import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function openDb() {
  return open({
    filename: path.resolve(__dirname, '../school.db'),
    driver: sqlite3.Database
  });
}

export async function initDb() {
  console.log('Initializing database and creating tables...');
  const db = await openDb();
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT,
        student_id TEXT UNIQUE,
        class TEXT,
        password TEXT
      );
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT
      );
      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        subject TEXT,
        score INTEGER,
        grade TEXT,
        term TEXT,
        session TEXT,
        class TEXT
      );
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
      );
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
      );
      CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullname TEXT,
        email TEXT UNIQUE,
        password TEXT
      );
      CREATE TABLE IF NOT EXISTS teacher_classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER,
        class_id INTEGER,
        FOREIGN KEY (teacher_id) REFERENCES teachers(id),
        FOREIGN KEY (class_id) REFERENCES classes(id)
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
      );
      CREATE TABLE IF NOT EXISTS remarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        class TEXT,
        term TEXT,
        session TEXT,
        remark TEXT
      );
    `);
    // Ensure additional columns exist on results table
    try { await db.exec('ALTER TABLE results ADD COLUMN ca1 INTEGER DEFAULT 0'); } catch (_) {}
    try { await db.exec('ALTER TABLE results ADD COLUMN ca2 INTEGER DEFAULT 0'); } catch (_) {}
    try { await db.exec('ALTER TABLE results ADD COLUMN ca3 INTEGER DEFAULT 0'); } catch (_) {}
    try { await db.exec('ALTER TABLE results ADD COLUMN remark TEXT'); } catch (_) {}
    try { await db.exec('ALTER TABLE results ADD COLUMN approved INTEGER DEFAULT 0'); } catch (_) {}
    console.log('Database tables created or already exist.');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
} 
