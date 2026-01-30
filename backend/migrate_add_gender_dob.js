import { openDb } from './db.js';

async function migrate() {
  const db = await openDb();
  try {
    await db.exec('ALTER TABLE students ADD COLUMN gender TEXT');
    console.log('Added gender column to students table');
  } catch (e) {
    console.log('gender column may already exist:', e.message);
  }
  try {
    await db.exec('ALTER TABLE students ADD COLUMN dob TEXT');
    console.log('Added dob column to students table');
  } catch (e) {
    console.log('dob column may already exist:', e.message);
  }
  await db.close();
  console.log('Migration completed!');
}

migrate();
