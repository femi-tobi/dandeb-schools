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

// Insert or update (upsert) a manual result. Partial fields allowed (e.g., only ca1).
router.post('/manual', async (req, res) => {
  const {
    student_id,
    subject,
    ca1 = null,
    ca2 = null,
    ca3 = null,
    score = null,
    grade = null,
    term,
    session,
    remark = '',
    class: className
  } = req.body;

  if (!student_id || !subject || !term || !session || !className) {
    return res.status(400).json({ message: 'student_id, subject, term, session, and class are required.' });
  }

  const db = await openDb();
  try {
    // Check if a result already exists for this student/subject/term/session/class
    const existing = await db.get(
      'SELECT * FROM results WHERE student_id = ? AND subject = ? AND term = ? AND session = ? AND class = ?',
      [student_id, subject, term, session, className]
    );

    if (existing) {
      // Merge partial fields: if provided (not null) use new value, else keep existing
      const newCa1 = ca1 !== null && ca1 !== '' ? Number(ca1) : existing.ca1;
      const newCa2 = ca2 !== null && ca2 !== '' ? Number(ca2) : existing.ca2;
      const newCa3 = ca3 !== null && ca3 !== '' ? Number(ca3) : existing.ca3;
      const newScore = score !== null && score !== '' ? Number(score) : existing.score;
      const newGrade = (grade !== null && grade !== '') ? grade : existing.grade;
      const newRemark = remark || existing.remark || '';

      await db.run(
        `UPDATE results SET ca1 = ?, ca2 = ?, ca3 = ?, score = ?, grade = ?, remark = ?, approved = 0 WHERE id = ?`,
        [newCa1, newCa2, newCa3, newScore, newGrade, newRemark, existing.id]
      );

      return res.json({ message: 'Result updated (unapproved) and sent for re-approval', id: existing.id });
    }

    // Insert new result; missing numeric fields default to NULL or 0 depending on DB schema
    const insert = await db.run(
      'INSERT INTO results (student_id, subject, ca1, ca2, ca3, score, grade, term, session, remark, approved, class) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [student_id, subject, ca1 !== null && ca1 !== '' ? Number(ca1) : null,
        ca2 !== null && ca2 !== '' ? Number(ca2) : null,
        ca3 !== null && ca3 !== '' ? Number(ca3) : null,
        score !== null && score !== '' ? Number(score) : null,
        grade || null, term, session, remark || '', 0, className]
    );

    res.json({ message: 'Result added (pending approval)', id: insert.lastID });
  } catch (err) {
    console.error('Error in /manual', err);
    res.status(500).json({ message: 'Error saving result' });
  }
});

// Allow updating an existing result by id -- teachers can come back and complete fields.
router.put('/manual/:id', async (req, res) => {
  const id = req.params.id;
  const { ca1 = null, ca2 = null, ca3 = null, score = null, grade = null, remark = null } = req.body;
  const db = await openDb();
  try {
    const existing = await db.get('SELECT * FROM results WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ message: 'Result not found' });

    const newCa1 = ca1 !== null && ca1 !== '' ? Number(ca1) : existing.ca1;
    const newCa2 = ca2 !== null && ca2 !== '' ? Number(ca2) : existing.ca2;
    const newCa3 = ca3 !== null && ca3 !== '' ? Number(ca3) : existing.ca3;
    const newScore = score !== null && score !== '' ? Number(score) : existing.score;
    const newGrade = (grade !== null && grade !== '') ? grade : existing.grade;
    const newRemark = remark !== null ? remark : existing.remark;

    await db.run(
      `UPDATE results SET ca1 = ?, ca2 = ?, ca3 = ?, score = ?, grade = ?, remark = ?, approved = 0 WHERE id = ?`,
      [newCa1, newCa2, newCa3, newScore, newGrade, newRemark, id]
    );

    res.json({ message: 'Result updated (unapproved)' });
  } catch (err) {
    console.error('Error updating result', err);
    res.status(500).json({ message: 'Error updating result' });
  }
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
