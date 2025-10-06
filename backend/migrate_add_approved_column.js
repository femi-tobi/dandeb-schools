import { openDb } from './db.js';

(async () => {
  const db = await openDb();
  await db.exec(`
    ALTER TABLE results ADD COLUMN approved INTEGER DEFAULT 0;
  `).catch(() => {});
  console.log('Migration complete: approved column added to results table.');
  process.exit(0);
})();
