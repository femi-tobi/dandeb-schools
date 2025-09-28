import { openDb } from './db.js';

(async () => {
  const db = await openDb();
  // Add photo column if it doesn't exist
  await db.exec(`
    ALTER TABLE students ADD COLUMN photo TEXT;
  `).catch(() => {});
  console.log('Migration complete: photo column added to students table.');
  process.exit(0);
})(); 
