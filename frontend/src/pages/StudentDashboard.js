import React, { useEffect, useState } from 'react';
import axios from 'axios';

const gradeColor = (grade) => {
  switch (grade) {
    case 'A': return 'text-green-600 font-bold';
    case 'B': return 'text-green-500 font-bold';
    case 'C': return 'text-yellow-600 font-bold';
    case 'D': return 'text-orange-600 font-bold';
    case 'F': return 'text-red-600 font-bold';
    default: return '';
  }
};

const TERMS = ['1st Term', '2nd Term', '3rd Term'];
const SESSIONS = ['2023/24', '2024/25'];

export default function StudentDashboard() {
  const [results, setResults] = useState([]);
  const [student, setStudent] = useState({});
  const [term, setTerm] = useState('2nd Term');
  const [session, setSession] = useState('2024/25');
  const [teacherRemark, setTeacherRemark] = useState('');

  useEffect(() => {
    // Get student info from localStorage
    const studentData = localStorage.getItem('student');
    if (!studentData) return;
    const studentObj = JSON.parse(studentData);
    setStudent(studentObj);
    axios.get(`http://localhost:5000/api/student/${studentObj.student_id}/result?term=${term}&session=${session}`)
      .then(res => setResults(res.data))
      .catch(err => {
        let msg = 'Could not load results. Please check your connection or contact admin.';
        if (err.response && err.response.data && err.response.data.message) {
          msg = err.response.data.message;
        } else if (err.message) {
          msg = err.message;
        }
        alert(msg);
        setResults([]);
        console.error(err);
      });
    // Fetch teacher's remark
    axios.get(`http://localhost:5000/api/remarks?student_id=${studentObj.student_id}&class=${studentObj.class}&term=${term}&session=${session}`)
      .then(res => setTeacherRemark(res.data?.remark || ''))
      .catch(() => setTeacherRemark(''));
  }, [term, session]);

  // Calculate grand total and average based on all components (CA1+CA2+CA3+Exam)
  const grandTotal = results.reduce((sum, r) => {
    const ca1 = Number(r.ca1) || 0;
    const ca2 = Number(r.ca2) || 0;
    const ca3 = Number(r.ca3) || 0;
    const exam = Number(r.score) || 0;
    return sum + ca1 + ca2 + ca3 + exam;
  }, 0);
  const average = results.length ? (grandTotal / results.length).toFixed(1) : 0;
  const position = 5; // Placeholder
  const remark = average >= 70 ? 'Excellent' : average >= 50 ? 'Good' : 'Needs Improvement';

  // Avatar initials
  const initials = student.fullname ? student.fullname.split(' ').map(n => n[0]).join('').toUpperCase() : '';

  // Debug log for results
  console.log('Student results:', results);

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header Bar */}
      <header className="bg-green-700 text-white flex items-center justify-between px-8 py-4 shadow">
        <div className="flex items-center gap-4">
          {student.photo ? (
            <img
              src={`http://localhost:5000/${student.photo.replace('backend/', '')}`}
              alt="Passport"
              className="w-16 h-16 rounded object-cover border-2 border-green-300 bg-white"
            />
          ) : (
            <div className="bg-white text-green-700 rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold border-2 border-green-300">
              {initials}
            </div>
          )}
          <div>
            <div className="font-bold text-lg flex items-center gap-2">
              Welcome, {student.fullname} <span className="text-green-200 text-sm">({student.class})</span>
            </div>
            <div className="text-sm text-green-200">Session: {session} | Term: {term}</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="font-extrabold text-2xl tracking-wide hidden md:block">Dandeb School</span>
          <button className="bg-green-600 hover:bg-green-800 px-4 py-2 rounded text-white font-semibold" onClick={() => { localStorage.clear(); window.location = '/'; }}>Logout</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto mt-8 p-4">
        {/* Term/Session Selector */}
        <div className="flex gap-4 mb-6 items-center">
          <label className="font-semibold text-green-800">Session:</label>
          <select value={session} onChange={e => setSession(e.target.value)} className="p-2 rounded border-green-300 border focus:outline-none">
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="font-semibold text-green-800 ml-4">Term:</label>
          <select value={term} onChange={e => setTerm(e.target.value)} className="p-2 rounded border-green-300 border focus:outline-none">
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {/* Summary Card */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-100 rounded shadow p-4 text-center">
            <div className="text-green-700 text-xs">Total</div>
            <div className="text-2xl font-bold text-green-900">{grandTotal}</div>
          </div>
          <div className="bg-green-100 rounded shadow p-4 text-center">
            <div className="text-green-700 text-xs">Average</div>
            <div className="text-2xl font-bold text-green-900">{average}</div>
          </div>
          <div className="bg-green-100 rounded shadow p-4 text-center">
            <div className="text-green-700 text-xs">Position</div>
            <div className="text-2xl font-bold text-green-900">{position}th</div>
          </div>
          <div className="bg-green-100 rounded shadow p-4 text-center">
            <div className="text-green-700 text-xs">Remark</div>
            <div className="text-2xl font-bold text-green-900">{remark}</div>
          </div>
        </div>

        {/* Results Table */}
        {results.length === 0 ? (
          <div className="text-center text-red-600 font-bold my-8">
            Your results are pending approval by the admin. Please check back later.
          </div>
        ) : (
          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-green-200">
                <tr>
                  <th className="py-2 px-4 text-left text-green-900">Subject</th>
                  <th className="py-2 px-4 text-left text-green-900">CA1</th>
                  <th className="py-2 px-4 text-left text-green-900">CA2</th>
                  <th className="py-2 px-4 text-left text-green-900">CA3</th>
                  <th className="py-2 px-4 text-left text-green-900">Exam</th>
                  <th className="py-2 px-4 text-left text-green-900">Total</th>
                  <th className="py-2 px-4 text-left text-green-900">Grade</th>
                  <th className="py-2 px-4 text-left text-green-900">Remark</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const ca1 = Number(r.ca1) || 0;
                  const ca2 = Number(r.ca2) || 0;
                  const ca3 = Number(r.ca3) || 0;
                  const exam = Number(r.score) || 0;
                  const total = ca1 + ca2 + ca3 + exam;
                  return (
                    <tr key={r.subject} className={i % 2 === 0 ? 'bg-green-50' : ''}>
                      <td className="py-2 px-4">{r.subject}</td>
                      <td className="py-2 px-4">{r.ca1}</td>
                      <td className="py-2 px-4">{r.ca2}</td>
                      <td className="py-2 px-4">{r.ca3}</td>
                      <td className="py-2 px-4">{r.score}</td>
                      <td className="py-2 px-4">{total}</td>
                      <td className={`py-2 px-4 ${gradeColor(r.grade)}`}>{r.grade}</td>
                      <td className="py-2 px-4">{r.remark}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Download Button */}
        <div className="flex flex-col items-center mt-6">
          <img src="/images.jpg" alt="School Logo" className="w-24 h-24 object-contain mb-2" />
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-semibold shadow"
            onClick={() => window.open(`http://localhost:5000/api/student/${student.student_id}/result/pdf?term=${term}&session=${session}`)}
          >
            🔽 Download Result as PDF
          </button>
        </div>
      </main>
    </div>
  );
} 