import express from 'express';
import bcrypt from 'bcrypt';
import { openDb } from '../db.js';

const router = express.Router();

// Get all teachers
router.get('/teachers', async (req, res) => {
  const db = await openDb();
  const teachers = await db.all('SELECT * FROM teachers');
  res.json(teachers);
});

// Add teacher
router.post('/teachers', async (req, res) => {
  const { fullname, email, password, session } = req.body;
  const db = await openDb();
  const hashed = await bcrypt.hash(password, 10);
  try {
  await db.run('INSERT INTO teachers (fullname, email, password, session) VALUES (?, ?, ?, ?)', [fullname, email, hashed, session]);
    res.json({ message: 'Teacher added' });
  } catch (e) {
    res.status(400).json({ message: 'Email must be unique' });
  }
});

// Edit teacher
router.put('/teachers/:id', async (req, res) => {
  const { fullname, email, password, session } = req.body;
  const { id } = req.params;
  const db = await openDb();
  if (password) {
    const hashed = await bcrypt.hash(password, 10);
  await db.run('UPDATE teachers SET fullname = ?, email = ?, password = ?, session = ? WHERE id = ?', [fullname, email, hashed, session, id]);
  } else {
  await db.run('UPDATE teachers SET fullname = ?, email = ?, session = ? WHERE id = ?', [fullname, email, session, id]);
  }
  res.json({ message: 'Teacher updated' });
});

// Delete teacher
router.delete('/teachers/:id', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();
  await db.run('DELETE FROM teachers WHERE id = ?', [id]);
  await db.run('DELETE FROM teacher_classes WHERE teacher_id = ?', [id]);
  res.json({ message: 'Teacher deleted' });
});

// Assign classes to teacher
router.post('/teachers/:id/classes', async (req, res) => {
  const { classIds } = req.body; // array of class ids
  const { id } = req.params;
  const db = await openDb();
  await db.run('DELETE FROM teacher_classes WHERE teacher_id = ?', [id]);
  for (const classId of classIds) {
    await db.run('INSERT INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)', [id, classId]);
  }
  res.json({ message: 'Classes assigned' });
});

// Get teacher's classes
router.get('/teachers/:id/classes', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();
  const classes = await db.all('SELECT c.* FROM classes c JOIN teacher_classes tc ON c.id = tc.class_id WHERE tc.teacher_id = ?', [id]);
  res.json(classes);
});

// Get all students in teacher's classes
router.get('/teachers/:id/students', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();
  // Get all class IDs assigned to this teacher
  const classRows = await db.all('SELECT class_id FROM teacher_classes WHERE teacher_id = ?', [id]);
  const classIds = classRows.map(row => row.class_id);
  if (classIds.length === 0) {
    return res.json([]); // No classes assigned
  }
  // Get class names for these IDs
  const placeholders = classIds.map(() => '?').join(',');
  const classNameRows = await db.all(`SELECT name FROM classes WHERE id IN (${placeholders})`, classIds);
  const classNames = classNameRows.map(row => row.name);
  if (classNames.length === 0) {
    return res.json([]); // No class names found
  }
  // Get all students whose class matches any of these class names
  const studentPlaceholders = classNames.map(() => '?').join(',');
  const students = await db.all(`SELECT * FROM students WHERE class IN (${studentPlaceholders})`, classNames);
  res.json(students);
});

export default router; 
