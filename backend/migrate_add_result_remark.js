import { openDb } from './db.js';

async function migrate() {
  const db = await openDb();
  // Add 'remark' column if it doesn't exist
  await db.exec(`ALTER TABLE results ADD COLUMN remark TEXT`)
    .then(() => console.log('Added remark column to results table.'))
    .catch(err => {
      if (err.message.includes('duplicate column name')) {
        console.log('remark column already exists.');
      } else {
        throw err;
      }
    });
  await db.close();
}

migrate(); 
