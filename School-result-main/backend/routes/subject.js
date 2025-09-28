import express from 'express';
import { openDb } from '../db.js';
const router = express.Router();

// Get all subjects
router.get('/', async (req, res) => {
  const db = await openDb();
  const subjects = await db.all('SELECT * FROM subjects');
  res.json(subjects);
});

// Add a subject
router.post('/', async (req, res) => {
  const { name } = req.body;
  const db = await openDb();
  try {
    await db.run('INSERT INTO subjects (name) VALUES (?)', [name]);
    res.json({ message: 'Subject added' });
  } catch (e) {
    res.status(400).json({ message: 'Subject must be unique' });
  }
});

// Delete a subject
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();
  await db.run('DELETE FROM subjects WHERE id = ?', [id]);
  res.json({ message: 'Subject deleted' });
});

export default router; 