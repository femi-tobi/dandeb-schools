#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { openDb } from '../db.js';

async function main() {
  const file = path.resolve('backend', 'data', 'students_import.json');
  if (!fs.existsSync(file)) {
    console.error('students_import.json not found at', file);
    process.exit(1);
  }
  const raw = fs.readFileSync(file, 'utf8');
  let students = JSON.parse(raw);
  if (!Array.isArray(students)) students = [];

  const db = await openDb();
  let added = 0;
  let skipped = 0;
  for (const s of students) {
    const fullname = (s.fullname || '').trim();
    const className = (s.class || '').trim();
    if (!fullname || !className) { skipped++; continue; }

    // Generate a student_id: CLASS-XXXX where XXXX is zero-padded serial based on timestamp+index
    const base = className.replace(/\s+/g, '').toUpperCase();
    const serial = String(Math.floor(Math.random() * 9000) + 1000);
    const student_id = `${base}-${serial}`;

    // Default password: lastname or first word of fullname lowercased + '123' (hashed)
    const parts = fullname.split(/\s+/);
    const passwordPlain = (parts.length > 1 ? parts[parts.length - 1] : parts[0]).toLowerCase() + '123';
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    try {
      await db.run(
        'INSERT INTO students (fullname, student_id, class, password) VALUES (?, ?, ?, ?)',
        [fullname, student_id, className, passwordHash]
      );
      console.log('Added:', fullname, className, student_id);
      added++;
    } catch (e) {
      // Likely unique constraint on student_id; try a different id or skip
      console.warn('Skipping (maybe duplicate):', fullname, '->', e.message);
      skipped++;
    }
  }

  console.log(`Import finished. Added: ${added}. Skipped: ${skipped}.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
