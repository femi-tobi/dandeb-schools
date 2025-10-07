import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import { openDb } from '../db.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  const fileRows = [];
  const selectedClass = req.body.class; // optional; can also be provided per row
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => fileRows.push(row))
    .on('end', async () => {
      const db = await openDb();
      try {
        await db.exec('BEGIN');
        for (const row of fileRows) {
          const studentId = String(row.student_id || '').trim();
          const subject = String(row.subject || '').trim();
          const ca1 = Number(row.ca1 || 0) || 0;
          const ca2 = Number(row.ca2 || 0) || 0;
          const ca3 = Number(row.ca3 || 0) || 0;
          const score = Number(row.score || 0) || 0;
          const grade = String(row.grade || '').trim();
          const term = String(row.term || '').trim();
          const sessionVal = String(row.session || '').trim();
          const remark = String(row.remark || '').trim();
          const className = String(row.class || selectedClass || '').trim();
          if (!studentId || !subject || !term || !sessionVal || !className) {
            continue; // skip invalid rows
          }
          await db.run(
            'INSERT INTO results (student_id, subject, ca1, ca2, ca3, score, grade, term, session, remark, approved, class) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [studentId, subject, ca1, ca2, ca3, score, grade, term, sessionVal, remark, 1, className]
          );
        }
        await db.exec('COMMIT');
        res.json({ message: 'Results uploaded' });
      } catch (e) {
        try { await db.exec('ROLLBACK'); } catch {}
        res.status(500).json({ message: 'Error uploading results' });
      } finally {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
    });
});

router.post('/manual', async (req, res) => {
  const { student_id, subject, ca1 = 0, ca2 = 0, ca3 = 0, score, grade, term, session, remark = '', class: className } = req.body;
  if (!student_id || !subject || !term || !session || !className) {
    return res.status(400).json({ message: 'student_id, subject, term, session, and class are required.' });
  }
  const db = await openDb();
  await db.run(
    'INSERT INTO results (student_id, subject, ca1, ca2, ca3, score, grade, term, session, remark, approved, class) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [student_id, subject, ca1, ca2, ca3, score, grade, term, session, remark, 0, className]
  );
  res.json({ message: 'Result added' });
});

// Fetch results by class
router.get('/', async (req, res) => {
  const { student_id, subject, term, session, class: className, approved } = req.query;
  const db = await openDb();

  const whereClauses = [];
  const params = [];

  if (student_id) { whereClauses.push('student_id = ?'); params.push(student_id); }
  if (subject) { whereClauses.push('subject = ?'); params.push(subject); }
  if (term) { whereClauses.push('term = ?'); params.push(term); }
  if (session) { whereClauses.push('session = ?'); params.push(session); }
  if (className) { whereClauses.push('class = ?'); params.push(className); }
  if (approved !== undefined) { whereClauses.push('approved = ?'); params.push(Number(approved) ? 1 : 0); }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const sql = `SELECT * FROM results ${whereSql}`;
  const results = await db.all(sql, params);
  res.json(results);
});

// Fetch results for a student, term, and session, only if approved
router.get('/student/:student_id/result', async (req, res) => {
  const { student_id } = req.params;
  const { term, session } = req.query;
  const db = await openDb();
  try {
    const sql = 'SELECT * FROM results WHERE student_id = ? AND term = ? AND session = ? AND approved = 1';
    const params = [student_id, term, session];
    const results = await db.all(sql, params);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
});

export default router; 
