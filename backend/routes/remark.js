import express from 'express';
import { openDb } from '../db.js';
const router = express.Router();

// Get remark for a student/class/term/session
router.get('/', async (req, res) => {
  const { student_id, class: className, term, session } = req.query;
  const db = await openDb();
  const remark = await db.get(
    'SELECT * FROM remarks WHERE student_id = ? AND class = ? AND term = ? AND session = ?',
    [student_id, className, term, session]
  );
  res.json(remark || {});
});

// Add or update remark
router.post('/', async (req, res) => {
  const { student_id, class: className, term, session, remark } = req.body;
  const db = await openDb();
  // Check if remark exists
  const existing = await db.get(
    'SELECT * FROM remarks WHERE student_id = ? AND class = ? AND term = ? AND session = ?',
    [student_id, className, term, session]
  );
  if (existing) {
    await db.run(
      'UPDATE remarks SET remark = ? WHERE id = ?',
      [remark, existing.id]
    );
    res.json({ message: 'Remark updated' });
  } else {
    await db.run(
      'INSERT INTO remarks (student_id, class, term, session, remark) VALUES (?, ?, ?, ?, ?)',
      [student_id, className, term, session, remark]
    );
    res.json({ message: 'Remark added' });
  }
});

export default router; 
