import { openDb } from './db.js';
import { initDb } from './db.js';
import bcrypt from 'bcrypt';

async function seed() {
  const db = await openDb();

  // Add classes
  const classNames = ['JSS1A', 'JSS1B', 'JSS2A', 'JSS2B', 'JSS3A', 'JSS3B'];
  for (const name of classNames) {
    await db.run('INSERT OR IGNORE INTO classes (name) VALUES (?)', [name]);
  }

  // Demo students for each class
  const demoStudents = {
    JSS1A: ['Alice Johnson', 'Ben Smith', 'Cynthia Lee'],
    JSS1B: ['David Brown', 'Ella White', 'Frank Green'],
    JSS2A: ['Grace Black', 'Henry Adams', 'Ivy Clark'],
    JSS2B: ['John Doe', 'Kate Miller', 'Liam Scott'],
    JSS3A: ['Mona King', 'Nate Young', 'Olivia Hall'],
    JSS3B: ['Paul Allen', 'Quinn Baker', 'Rita Evans'],
  };
  let studentId = 100001;
  const defaultPassword = await bcrypt.hash('password123', 10);
  for (const [cls, names] of Object.entries(demoStudents)) {
    for (const fullname of names) {
      const sid = (studentId++).toString();
      await db.run(
        'INSERT OR IGNORE INTO students (fullname, student_id, class, password) VALUES (?, ?, ?, ?)',
        [fullname, sid, cls, defaultPassword]
      );
    }
  }

  // Add demo teachers and assign to classes
  const demoTeachers = [
    { fullname: 'Mrs. Green', email: 'green@bosol.com', password: 'teach123', classes: ['JSS1A'] },
    { fullname: 'Mr. Blue', email: 'blue@bosol.com', password: 'teach123', classes: ['JSS1B', 'JSS2A'] },
    { fullname: 'Ms. Red', email: 'red@bosol.com', password: 'teach123', classes: ['JSS2B'] },
    { fullname: 'Mrs. Yellow', email: 'yellow@bosol.com', password: 'teach123', classes: ['JSS3A', 'JSS3B'] },
  ];
  for (const teacher of demoTeachers) {
    const hashed = await bcrypt.hash(teacher.password, 10);
    await db.run('INSERT OR IGNORE INTO teachers (fullname, email, password) VALUES (?, ?, ?)', [teacher.fullname, teacher.email, hashed]);
    const t = await db.get('SELECT id FROM teachers WHERE email = ?', [teacher.email]);
    for (const cname of teacher.classes) {
      const c = await db.get('SELECT id FROM classes WHERE name = ?', [cname]);
      if (c && t) {
        await db.run('INSERT OR IGNORE INTO teacher_classes (teacher_id, class_id) VALUES (?, ?)', [t.id, c.id]);
      }
    }
  }

  // Add a test admin
  const adminPassword = await bcrypt.hash('adminpass', 10);
  await db.run(
    'INSERT OR IGNORE INTO admins (email, password) VALUES (?, ?)',
    ['admin@example.com', adminPassword]
  );

  console.log('Seeded demo students, teachers, and admin.');
}

async function seedSubjects() {
  const db = await openDb();
  const subjects = ['english', 'mathematics', 'yoruba'];
  for (const name of subjects) {
    await db.run('INSERT OR IGNORE INTO subjects (name) VALUES (?)', [name]);
  }
  console.log('Subjects seeded');
}

async function main() {
  await initDb();
  await seed();
  await seedSubjects();
  process.exit();
}

main(); 
