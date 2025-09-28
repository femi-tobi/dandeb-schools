import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { openDb } from '../db.js';

const router = express.Router();

console.log('JWT_SECRET:', process.env.JWT_SECRET);

// Teacher login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await openDb();
  const teacher = await db.get('SELECT * FROM teachers WHERE email = ?', [email]);
  if (!teacher) return res.status(401).json({ message: 'Teacher not found' });
  const match = await bcrypt.compare(password, teacher.password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: teacher.id, isTeacher: true }, 'mydevelopmentsecret123', { expiresIn: '1d' });
  const { password: _pw, ...teacherWithoutPassword } = teacher;
  res.json({ token, teacher: teacherWithoutPassword });
});

// Teacher change password
router.post('/change-password', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  const db = await openDb();
  const teacher = await db.get('SELECT * FROM teachers WHERE email = ?', [email]);
  if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
  const match = await bcrypt.compare(oldPassword, teacher.password);
  if (!match) return res.status(401).json({ message: 'Old password incorrect' });
  const hashed = await bcrypt.hash(newPassword, 10);
  await db.run('UPDATE teachers SET password = ? WHERE email = ?', [hashed, email]);
  res.json({ message: 'Password changed' });
});

export default router; 
