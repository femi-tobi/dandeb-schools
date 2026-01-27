import express from 'express';
import bcrypt from 'bcrypt';
import { openDb } from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join('backend', 'uploads', 'photos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage: photoStorage });

// Get students by class
router.get('/students', async (req, res) => {
  const { class: className } = req.query;
  const db = await openDb();
  let students;
  if (className) {
    students = await db.all('SELECT * FROM students WHERE class = ?', [className]);
  } else {
    students = await db.all('SELECT * FROM students');
  }
  res.json(students);
});

// Update POST /students to accept photo upload
router.post('/students', upload.single('photo'), async (req, res) => {
  const { fullname, student_id, class: className, password, session, gender, dob } = req.body;
  console.log('Received student POST:', { fullname, student_id, className, password, gender, dob });
  const db = await openDb();
  const hashed = await bcrypt.hash(password, 10);
  let photoPath = null;
  if (req.file) {
    photoPath = req.file.path.replace(/\\/g, '/');
  }
  try {
    await db.run(
      'INSERT INTO students (fullname, student_id, class, password, photo, session, gender, dob) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [fullname, student_id, className, hashed, photoPath, session, gender, dob]
    );
    res.json({ message: 'Student added' });
  } catch (e) {
    console.error('Error adding student:', e);
    res.status(400).json({ message: 'Student ID must be unique', error: e.message });
  }
});

// Update PUT /students/:id to accept photo upload
router.put('/students/:id', upload.single('photo'), async (req, res) => {
  const { fullname, class: className, password, session, gender, dob } = req.body;
  const { id } = req.params;
  const db = await openDb();
  let photoPath = null;
  if (req.file) {
    photoPath = req.file.path.replace(/\\/g, '/');
  }
  if (password) {
    const hashed = await bcrypt.hash(password, 10);
    if (photoPath) {
      await db.run('UPDATE students SET fullname = ?, class = ?, password = ?, photo = ?, session = ?, gender = ?, dob = ? WHERE id = ?', [fullname, className, hashed, photoPath, session, gender, dob, id]);
    } else {
      await db.run('UPDATE students SET fullname = ?, class = ?, password = ?, session = ?, gender = ?, dob = ? WHERE id = ?', [fullname, className, hashed, session, gender, dob, id]);
    }
  } else {
    if (photoPath) {
      await db.run('UPDATE students SET fullname = ?, class = ?, photo = ?, session = ?, gender = ?, dob = ? WHERE id = ?', [fullname, className, photoPath, session, gender, dob, id]);
    } else {
      await db.run('UPDATE students SET fullname = ?, class = ?, session = ?, gender = ?, dob = ? WHERE id = ?', [fullname, className, session, gender, dob, id]);
    }
  }
  res.json({ message: 'Student updated' });
});

router.delete('/students/:id', async (req, res) => {
  const { id } = req.params;
  const db = await openDb();
  await db.run('DELETE FROM students WHERE id = ?', [id]);
  res.json({ message: 'Student deleted' });
});

// Get students with unapproved results
router.get('/pending-students', async (req, res) => {
  const db = await openDb();
  try {
    const rows = await db.all(`
      SELECT r.student_id, s.fullname, s.class, r.term, r.session
      FROM results r
      JOIN students s ON r.student_id = s.student_id
      WHERE r.approved = 0
      GROUP BY r.student_id, r.term, r.session
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
});

// Approve all results for a student for a term/session
router.post('/approve-student-results', async (req, res) => {
  const { student_id, term, session } = req.body;
  const db = await openDb();
  try {
    await db.run(
      'UPDATE results SET approved = 1 WHERE student_id = ? AND term = ? AND session = ?',
      [student_id, term, session]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
});

// Bulk approve: accepts an array of items { student_id, term, session }
router.post('/approve-results-bulk', async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'No items provided' });
  const db = await openDb();
  try {
    // Use a transaction-like loop; sqlite3 wrapper will run sequentially
    for (const it of items) {
      const { student_id, term, session } = it;
      if (!student_id || !term || !session) continue;
      await db.run('UPDATE results SET approved = 1 WHERE student_id = ? AND term = ? AND session = ?', [student_id, term, session]);
    }
    res.json({ success: true, processed: items.length });
  } catch (err) {
    console.error('Bulk approve error', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// === PROMOTION LOGIC ===
router.post('/students/:student_id/promote', async (req, res) => {
  const { student_id } = req.params;
  const { session } = req.body;
  const db = await openDb();

  // Define the 3 terms and required subjects
  const terms = ['First', 'Second', 'Third'];
  const requiredSubjects = ['English', 'Mathematics'];

  // 1. Check if student has approved results for all 3 terms in the session
  let allTermsCompleted = true;
  for (const term of terms) {
    const results = await db.all(
      'SELECT * FROM results WHERE student_id = ? AND term = ? AND session = ? AND approved = 1',
      [student_id, term, session]
    );
    if (results.length === 0) {
      allTermsCompleted = false;
      break;
    }
  }
  if (!allTermsCompleted) {
    return res.json({ promoted: false, reason: 'Student has not completed all 3 terms with approved results.' });
  }

  // 2. Check if student passed English and Maths in all 3 terms
  let passedAllRequired = true;
  for (const term of terms) {
    for (const subject of requiredSubjects) {
      const result = await db.get(
        'SELECT * FROM results WHERE student_id = ? AND term = ? AND session = ? AND subject = ? AND approved = 1',
        [student_id, term, session, subject]
      );
      if (!result) {
        passedAllRequired = false;
        break;
      }
      // Pass if grade is not F9 or score >= 50
      const score = Number(result.score) || 0;
      if ((result.grade && result.grade === 'F9') || score < 50) {
        passedAllRequired = false;
        break;
      }
    }
    if (!passedAllRequired) break;
  }
  if (!passedAllRequired) {
    return res.json({ promoted: false, reason: 'Student did not pass English and/or Mathematics in all terms.' });
  }

  // 3. Promote student to next class
  // Get current class
  const student = await db.get('SELECT * FROM students WHERE student_id = ?', [student_id]);
  if (!student) {
    return res.status(404).json({ promoted: false, reason: 'Student not found.' });
  }
  const classOrder = [
    'JSS1', 'JSS2', 'JSS3',
    'SS1', 'SS2', 'SS3'
  ];
  const currentClassIndex = classOrder.indexOf(student.class);
  if (currentClassIndex === -1 || currentClassIndex === classOrder.length - 1) {
    return res.json({ promoted: false, reason: 'Student is in the last class or class is unrecognized.' });
  }
  const nextClass = classOrder[currentClassIndex + 1];
  await db.run('UPDATE students SET class = ? WHERE student_id = ?', [nextClass, student_id]);
  res.json({ promoted: true, newClass: nextClass });
});

export default router; 
