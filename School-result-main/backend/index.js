console.log("INDEX.JS STARTED");

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/student.js';
import adminRoutes from './routes/admin.js';
import resultRoutes from './routes/result.js';
import subjectRoutes from './routes/subject.js';
import classRoutes from './routes/class.js';
import teacherAuthRoutes from './routes/teacherAuth.js';
import teacherAdminRoutes from './routes/teacherAdmin.js';
import sessionRoutes from './routes/session.js';
import remarkRoutes from './routes/remark.js';


const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/backend', express.static('backend'));

await initDb();

app.use('/api', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/teacher', teacherAuthRoutes);
app.use('/api/admin', teacherAdminRoutes);
app.use('/api/remarks', remarkRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`)); 