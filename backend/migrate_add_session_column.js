import { openDb } from './db.js';

(async () => {
  const db = await openDb();
  // Add session column to students table
  await db.exec(`ALTER TABLE students ADD COLUMN session TEXT;`).catch(() => {});
  // Add session column to teachers table
  await db.exec(`ALTER TABLE teachers ADD COLUMN session TEXT;`).catch(() => {});
  console.log('Migration complete: session column added to students and teachers tables.');
  process.exit(0);
})();
