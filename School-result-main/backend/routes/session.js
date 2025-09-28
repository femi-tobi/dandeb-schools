import express from 'express';
import { openDb } from '../db.js';
const router = express.Router();

// Get all sessions
router.get('/', async (req, res) => {
  const db = await openDb();
  const sessions = await db.all('SELECT * FROM sessions');
  res.json(sessions);
});

// Add a session
router.post('/', async (req, res) => {
  const { name } = req.body;
  const db = await openDb();
  try {
    await db.run('INSERT INTO sessions (name) VALUES (?)', [name]);
    res.json({ message: 'Session added' });
  } catch (e) {
    res.status(400).json({ message: 'Session must be unique' });
  }
});

// Delete a session
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();
  await db.run('DELETE FROM sessions WHERE id = ?', [id]);
  res.json({ message: 'Session deleted' });
});

export default router; 