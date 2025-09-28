import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { openDb } from '../db.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  console.log('LOGIN BODY:', req.body);
  const { student_id, password, isAdmin, email } = req.body;
  const db = await openDb();
  let user;
  if (isAdmin) {
    user = await db.get('SELECT * FROM admins WHERE email = ?', [email]);
  } else {
    user = await db.get('SELECT * FROM students WHERE student_id = ?', [student_id]);
  }
  if (!user) return res.status(401).json({ message: 'User not found' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, isAdmin: !!isAdmin }, 'mydevelopmentsecret123', { expiresIn: '1d' });
  // Remove password but keep all other fields
  const { password: _pw, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});

router.post('/change-password', async (req, res) => {
  const { student_id, oldPassword, newPassword } = req.body;
  const db = await openDb();
  const user = await db.get('SELECT * FROM students WHERE student_id = ?', [student_id]);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) return res.status(401).json({ message: 'Old password incorrect' });
  const hashed = await bcrypt.hash(newPassword, 10);
  await db.run('UPDATE students SET password = ? WHERE student_id = ?', [hashed, student_id]);
  res.json({ message: 'Password changed' });
});

export default router; 
