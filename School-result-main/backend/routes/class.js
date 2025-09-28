import express from 'express';
import { openDb } from '../db.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const db = await openDb();
  const classes = await db.all('SELECT * FROM classes');
  res.json(classes);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  const db = await openDb();
  await db.run('INSERT INTO classes (name) VALUES (?)', [name]);
  res.json({ message: 'Class added' });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();
  const result = await db.run('DELETE FROM classes WHERE id = ?', [id]);
  if (result.changes > 0) {
    res.json({ message: 'Class deleted' });
  } else {
    res.status(404).json({ message: 'Class not found' });
  }
});

export default router; 