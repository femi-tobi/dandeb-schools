#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { openDb } from '../db.js';

async function main() {
  const db = await openDb();
  const rows = await db.all('SELECT student_id, fullname, class FROM students');
  const out = rows.map(r => {
    const parts = (r.fullname || '').trim().split(/\s+/);
    const pwd = (parts.length > 1 ? parts[parts.length - 1] : parts[0] || '').toLowerCase() + '123';
    return `${r.student_id},"${r.fullname}",${r.class},${pwd}`;
  });
  const outPath = path.resolve('backend', 'data', 'student_passwords.csv');
  fs.writeFileSync(outPath, 'student_id,fullname,class,password\n' + out.join('\n'));
  console.log('Wrote', outPath, 'with', rows.length, 'entries.');
}

main().catch(err => { console.error(err); process.exit(1); });
