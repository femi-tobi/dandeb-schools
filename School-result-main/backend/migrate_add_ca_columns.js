import { openDb } from './db.js';

(async () => {
  const db = await openDb();
  // Add ca1, ca2, ca3 columns if they don't exist
  await db.exec(`
    ALTER TABLE results ADD COLUMN ca1 INTEGER DEFAULT 0;
  `).catch(() => {});
  await db.exec(`
    ALTER TABLE results ADD COLUMN ca2 INTEGER DEFAULT 0;
  `).catch(() => {});
  await db.exec(`
    ALTER TABLE results ADD COLUMN ca3 INTEGER DEFAULT 0;
  `).catch(() => {});
  // Optionally, set all existing ca1, ca2, ca3 to 0 if null
  await db.exec(`UPDATE results SET ca1 = 0 WHERE ca1 IS NULL;`);
  await db.exec(`UPDATE results SET ca2 = 0 WHERE ca2 IS NULL;`);
  await db.exec(`UPDATE results SET ca3 = 0 WHERE ca3 IS NULL;`);
  console.log('Migration complete: ca1, ca2, ca3 columns added to results table.');
  process.exit(0);
})(); 