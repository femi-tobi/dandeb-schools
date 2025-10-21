import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { openDb } from '../db.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), async (req, res) => {
  // Expect term and session to be provided by admin before upload
  const providedTerm = String(req.body.term || '').trim();
  const providedSession = String(req.body.session || '').trim();
  const defaultClass = String(req.body.class || '').trim();
  if (!providedTerm || !providedSession) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(400).json({ message: 'Please provide term and session before uploading.' });
  }

  const raw = fs.readFileSync(req.file.path, 'utf8');
  const lines = raw.split(/\r?\n/).map(l => l.split(',').map(c => (c || '').trim()));
  // find header row and weights row (scan first 12 rows)
  let headerRowIdx = -1;
  let weightsRowIdx = -1;
  for (let i = 0; i < Math.min(12, lines.length - 1); i++) {
    const row = lines[i];
    const next = lines[i + 1] || [];
    const hasText = row.some(cell => cell && /[A-Za-z]/.test(cell));
    const numericCount = next.filter(cell => cell !== '' && !Number.isNaN(Number(cell))).length;
    if (hasText && numericCount >= 6) { // heuristic: weights row contains many numeric weight entries
      headerRowIdx = i;
      weightsRowIdx = i + 1;
      break;
    }
  }

  if (headerRowIdx === -1) {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    return res.status(400).json({ message: 'Could not detect subject header rows in CSV. Ensure subject names are in a header row and weights in the row below.' });
  }

  const headerRow = lines[headerRowIdx];
  // Build subject blocks starting from column index 3 (0-based)
  const subjectBlocks = [];
  let col = 3; // col 0 = name, col1 = seat, col2 = class
  while (col < headerRow.length) {
    const name = (headerRow[col] || '').trim();
    // If header cell empty but we still have a numeric weights row, try to use earlier non-empty header in this 4-col block
    if (!name) {
      // try to find preceding non-empty within this 4-col window
      const back = Math.max(0, col - 3);
      let found = '';
      for (let k = back; k < col; k++) { if (headerRow[k]) { found = headerRow[k]; break; } }
      if (found) {
        subjectBlocks.push({ name: found, start: col });
      } else {
        // if totally empty, break to avoid infinite loop
        // but still advance
        // do not push
      }
    } else {
      subjectBlocks.push({ name, start: col });
    }
    col += 4; // assume block size of 4: CA1, CA2, Exam, Total
  }

  const db = await openDb();
  const inserted = [];
  const skipped = [];
  const unmatched = [];
  try {
    await db.exec('BEGIN');
    // iterate over student rows after the weights row
    for (let r = weightsRowIdx + 1; r < lines.length; r++) {
      const row = lines[r];
      if (!row || row.length === 0) continue;
      const name = (row[0] || '').trim();
      if (!name) continue; // skip blank rows
      const seat = (row[1] || '').trim();
      const classFromRow = (row[2] || '').trim() || defaultClass;

      // Map name to student_id
      let student = null;
      if (name) {
        student = await db.get('SELECT * FROM students WHERE LOWER(TRIM(fullname)) = LOWER(TRIM(?)) LIMIT 1', [name]);
      }
      if (!student && seat) {
        // try lookup by student_id or seat number match
        student = await db.get('SELECT * FROM students WHERE student_id = ? LIMIT 1', [seat]);
      }
      if (!student && classFromRow) {
        // try fuzzy match by name and class
        student = await db.get('SELECT * FROM students WHERE LOWER(TRIM(fullname)) LIKE LOWER(TRIM(?)) AND class = ? LIMIT 1', [name + '%', classFromRow]);
      }

      if (!student) {
        unmatched.push({ row: r + 1, name, class: classFromRow });
        // still attempt to parse subjects but we cannot save without student_id
        continue;
      }

      const studentId = student.student_id;

      for (const sb of subjectBlocks) {
        const sName = sb.name;
        const start = sb.start;
        const ca1 = (row[start] || '').trim();
        const ca2 = (row[start + 1] || '').trim();
        const exam = (row[start + 2] || '').trim();
        // if no scores at all, skip
        if (!ca1 && !ca2 && !exam) continue;

        const ca1Num = ca1 === '' ? null : Number(ca1);
        const ca2Num = ca2 === '' ? null : Number(ca2);
        const examNum = exam === '' ? null : Number(exam);
        const term = providedTerm;
        const session = providedSession;
        const className = classFromRow || defaultClass || '';
        // compute total and grade if numeric values present
        const total = (Number(ca1Num || 0) + Number(ca2Num || 0) + Number(examNum || 0));
        const gradeVal = (total > 0) ? (() => {
          let p = Math.round(total);
          if (p < 0) p = 0; if (p > 100) p = 100;
          if (p >= 75) return 'A1';
          if (p >= 70) return 'B2';
          if (p >= 65) return 'B3';
          if (p >= 60) return 'C6';
          if (p >= 55) return 'D7';
          if (p >= 50) return 'E8';
          return 'F9';
        })() : null;

        await db.run(
          'INSERT INTO results (student_id, subject, ca1, ca2, ca3, score, grade, term, session, remark, approved, class) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [studentId, sName, ca1Num, ca2Num, null, examNum, gradeVal, term, session, '', 0, className]
        );
        inserted.push({ row: r + 1, student: studentId, subject: sName });
      }
    }

    await db.exec('COMMIT');
    // write unmatched rows to a CSV for admin review
    if (unmatched.length) {
      const outPath = `uploads/unmatched-${Date.now()}.csv`;
      const csvOut = ['row,name,class'].concat(unmatched.map(u => `${u.row},"${u.name}",${u.class}`)).join('\n');
      try { fs.writeFileSync(outPath, csvOut, 'utf8'); } catch (e) {}
    }

    res.json({ message: 'Results processed', inserted: inserted.length, skipped: skipped.length, unmatchedCount: unmatched.length });
  } catch (e) {
    try { await db.exec('ROLLBACK'); } catch (err) {}
    console.error('Upload error', e);
    res.status(500).json({ message: 'Error processing CSV upload' });
  } finally {
    try { fs.unlinkSync(req.file.path); } catch (e) {}
  }
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
