import { openDb } from './db.js';

async function clearResults() {
  const db = await openDb();
  await db.run('DELETE FROM results');
  console.log('All results cleared.');
  await db.close();
}

clearResults(); 