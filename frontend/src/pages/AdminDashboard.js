import React, { useState, useEffect } from 'react';
import axios from 'axios';

const NAV_ITEMS = [
  { key: 'students', label: 'Add/Edit Students' },
  { key: 'upload', label: 'Upload Result' },
  { key: 'subjects', label: 'Manage Subjects' },
  { key: 'sessions', label: 'Manage Sessions/Terms' },
  { key: 'classes', label: 'Manage Classes' },
  { key: 'history', label: 'View Result History' },
  { key: 'manageTeachers', label: 'Manage Teachers' },
];

export default function AdminDashboard() {
  const [csvFile, setCsvFile] = useState(null);
  const [form, setForm] = useState({
    student_id: '234567',
    subject: 'Samuel John',
    score: '76',
    grade: 'A',
    term: '2nd Term',
    session: '2024/25',
    class: '',
  });
  const [message, setMessage] = useState('');
  const [activePanel, setActivePanel] = useState('upload');
  const [classes, setClasses] = useState([]);
  const [newClass, setNewClass] = useState('');
  const [classMsg, setClassMsg] = useState('');

  // Add/Edit Students state
  const [selectedClass, setSelectedClass] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [studentForm, setStudentForm] = useState({ fullname: '', student_id: '', password: '', editId: null, photo: null });
  const [studentMsg, setStudentMsg] = useState('');

  // Manage Teachers state
  const [teachers, setTeachers] = useState([]);
  const [teacherForm, setTeacherForm] = useState({ fullname: '', email: '', password: '', editId: null });
  const [teacherMsg, setTeacherMsg] = useState('');
  const [assignClasses, setAssignClasses] = useState([]);
  const [assignTeacherId, setAssignTeacherId] = useState(null);

  // Manage Subjects state
  const [subjects, setSubjects] = useState([]);
  const [newSubject, setNewSubject] = useState('');
  const [subjectMsg, setSubjectMsg] = useState('');

  // Manage Sessions/Terms state
  const [sessions, setSessions] = useState([]);
  const [newSession, setNewSession] = useState('');
  const [sessionMsg, setSessionMsg] = useState('');

  // View Result History state
  const [results, setResults] = useState([]);
  const [historyFilters, setHistoryFilters] = useState({ student_id: '', class: '', term: '', session: '' });
  const [remark, setRemark] = useState('');

  // Add after other useState imports
  const [pendingStudents, setPendingStudents] = useState([]);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingModalResults, setPendingModalResults] = useState([]);
  const [pendingModalStudent, setPendingModalStudent] = useState(null);
  const [promotionMsg, setPromotionMsg] = useState('');

  // Add state for modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalStudent, setHistoryModalStudent] = useState(null);
  const [historyModalResults, setHistoryModalResults] = useState([]);

  // Group results by student_id for history panel (move this to top-level in the component)
  const grouped = {};
  results.forEach(r => {
    if (!grouped[r.student_id]) grouped[r.student_id] = { ...r, results: [] };
    grouped[r.student_id].results.push(r);
  });
  const historyStudents = Object.values(grouped).map(s => ({
    ...s,
    classes: Array.from(new Set(s.results.map(r => r.class))).join(', ')
  }));

  // Fetch classes on mount
  useEffect(() => {
    axios.get('http://localhost:5000/api/classes')
      .then(res => setClasses(res.data))
      .catch(err => setClasses([]));
  }, []);

  // Fetch students when selectedClass changes
  useEffect(() => {
    if (selectedClass) {
      axios.get(`http://localhost:5000/api/admin/students?class=${selectedClass}`)
        .then(res => setStudentsList(res.data))
        .catch(() => setStudentsList([]));
    } else {
      setStudentsList([]);
    }
  }, [selectedClass]);

  // Fetch teachers on mount or after changes
  useEffect(() => {
    if (activePanel === 'manageTeachers') {
      axios.get('http://localhost:5000/api/admin/teachers')
        .then(res => setTeachers(res.data))
        .catch(() => setTeachers([]));
    }
  }, [activePanel]);

  // Fetch subjects on mount or when panel is active
  useEffect(() => {
    if (activePanel === 'subjects') {
      axios.get('http://localhost:5000/api/subjects')
        .then(res => setSubjects(res.data))
        .catch(() => setSubjects([]));
    }
  }, [activePanel]);

  // Fetch sessions on mount
  useEffect(() => {
      axios.get('http://localhost:5000/api/sessions')
        .then(res => setSessions(res.data))
        .catch(() => setSessions([]));
  }, []);

  // Fetch results for history panel
  useEffect(() => {
    if (activePanel === 'history') {
      let url = 'http://localhost:5000/api/results?';
      const params = [];
      if (historyFilters.student_id) params.push(`student_id=${historyFilters.student_id}`);
      if (historyFilters.class) params.push(`class=${historyFilters.class}`);
      if (historyFilters.term) params.push(`term=${historyFilters.term}`);
      if (historyFilters.session) params.push(`session=${historyFilters.session}`);
      url += params.join('&');
      axios.get(url)
        .then(res => setResults(res.data))
        .catch(() => setResults([]));
    }
  }, [activePanel, historyFilters]);

  // Fetch remark for the first student in results when results change in history panel
  useEffect(() => {
    if (activePanel === 'history' && results.length > 0) {
      const r = results[0];
      axios.get(`http://localhost:5000/api/remarks?student_id=${r.student_id}&class=${r.class}&term=${r.term}&session=${r.session}`)
        .then(res => setRemark(res.data?.remark || ''))
        .catch(() => setRemark(''));
    } else {
      setRemark('');
    }
  }, [activePanel, results]);

  // Fetch pending students on mount
  useEffect(() => {
    axios.get('http://localhost:5000/api/admin/pending-students')
      .then(res => setPendingStudents(res.data))
      .catch(() => setPendingStudents([]));
  }, []);

  // Handlers for Upload Result
  const handleUpload = async () => {
    if (!csvFile || !form.class) {
      alert('Please select a class and choose a file.');
      return;
    }
    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('class', form.class);
    try {
      await axios.post('http://localhost:5000/api/results/upload', formData);
      alert('Results uploaded!');
    } catch (err) {
      let msg = 'Error uploading CSV.';
      if (err.response && err.response.data && err.response.data.message) {
        msg = err.response.data.message;
      } else if (err.message) {
        msg = err.message;
      }
      alert(msg);
      console.error(err);
    }
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.class) {
      setMessage('Please select a class.');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/results/manual', {
        ...form,
        ca1: form.ca1 || 0,
        ca2: form.ca2 || 0,
        ca3: form.ca3 || 0,
      });
      setMessage('Result added!');
      setForm({ ...form, subject: '', score: '', grade: '' });
    } catch (err) {
      let msg = 'Error adding result.';
      if (err.response && err.response.data && err.response.data.message) {
        msg = err.response.data.message;
      } else if (err.message) {
        msg = err.message;
      }
      setMessage(msg);
      console.error(err);
    }
  };

  // Manage Classes
  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClass.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/classes', { name: newClass });
      setClasses([...classes, { name: newClass }]);
      setClassMsg('Class added!');
      setNewClass('');
    } catch (err) {
      setClassMsg('Error adding class.');
    }
  };

  const handleDeleteClass = async (name) => {
    try {
      // Find class id
      const cls = classes.find(c => c.name === name);
      if (!cls || !cls.id) return;
      await axios.delete(`http://localhost:5000/api/classes/${cls.id}`);
      setClasses(classes.filter(c => c.name !== name));
    } catch (err) {
      setClassMsg('Error deleting class.');
    }
  };

  // Add/Edit Students handlers
  const handleStudentFormChange = (e) => {
    setStudentForm({ ...studentForm, [e.target.name]: e.target.value });
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!selectedClass || !studentForm.fullname || !studentForm.student_id || !studentForm.password) {
      setStudentMsg('All fields are required.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('fullname', studentForm.fullname);
      formData.append('student_id', studentForm.student_id);
      formData.append('class', selectedClass);
      formData.append('password', studentForm.password);
      if (studentForm.photo) formData.append('photo', studentForm.photo);
      await axios.post('http://localhost:5000/api/admin/students', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setStudentMsg('Student added!');
      setStudentForm({ fullname: '', student_id: '', password: '', editId: null, photo: null });
      // Refresh student list
      const res = await axios.get(`http://localhost:5000/api/admin/students?class=${selectedClass}`);
      setStudentsList(res.data);
    } catch (err) {
      setStudentMsg('Error adding student. Student ID must be unique.');
    }
  };

  const handleEditStudent = (student) => {
    setStudentForm({ fullname: student.fullname, student_id: student.student_id, password: '', editId: student.id, photo: null });
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.editId || !studentForm.fullname) return;
    try {
      const formData = new FormData();
      formData.append('fullname', studentForm.fullname);
      formData.append('class', selectedClass);
      if (studentForm.password) formData.append('password', studentForm.password);
      if (studentForm.photo) formData.append('photo', studentForm.photo);
      await axios.put(`http://localhost:5000/api/admin/students/${studentForm.editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setStudentMsg('Student updated!');
      setStudentForm({ fullname: '', student_id: '', password: '', editId: null, photo: null });
      // Refresh student list
      const res = await axios.get(`http://localhost:5000/api/admin/students?class=${selectedClass}`);
      setStudentsList(res.data);
    } catch (err) {
      setStudentMsg('Error updating student.');
    }
  };

  // Manage Teachers handlers
  const handleTeacherFormChange = (e) => {
    setTeacherForm({ ...teacherForm, [e.target.name]: e.target.value });
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!teacherForm.fullname || !teacherForm.email || (!teacherForm.editId && !teacherForm.password)) {
      setTeacherMsg('All fields are required.');
      return;
    }
    try {
      if (teacherForm.editId) {
        await axios.put(`http://localhost:5000/api/admin/teachers/${teacherForm.editId}`, {
          fullname: teacherForm.fullname,
          email: teacherForm.email,
          password: teacherForm.password || undefined,
        });
        setTeacherMsg('Teacher updated!');
      } else {
        await axios.post('http://localhost:5000/api/admin/teachers', {
          fullname: teacherForm.fullname,
          email: teacherForm.email,
          password: teacherForm.password,
        });
        setTeacherMsg('Teacher added!');
      }
      setTeacherForm({ fullname: '', email: '', password: '', editId: null });
      const res = await axios.get('http://localhost:5000/api/admin/teachers');
      setTeachers(res.data);
    } catch (err) {
      setTeacherMsg('Error adding/updating teacher. Email must be unique.');
    }
  };

  const handleEditTeacher = (teacher) => {
    setTeacherForm({ fullname: teacher.fullname, email: teacher.email, password: '', editId: teacher.id });
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/admin/teachers/${id}`);
      setTeacherMsg('Teacher deleted!');
      const res = await axios.get('http://localhost:5000/api/admin/teachers');
      setTeachers(res.data);
    } catch (err) {
      setTeacherMsg('Error deleting teacher.');
    }
  };

  // Assign classes to teacher
  const handleAssignClasses = (teacher) => {
    setAssignTeacherId(teacher.id);
    axios.get(`http://localhost:5000/api/admin/teachers/${teacher.id}/classes`)
      .then(res => setAssignClasses(res.data.map(c => c.id)))
      .catch(() => setAssignClasses([]));
  };

  const handleClassCheckbox = (classId) => {
    setAssignClasses(prev => prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]);
  };

  const handleSaveAssignedClasses = async () => {
    try {
      await axios.post(`http://localhost:5000/api/admin/teachers/${assignTeacherId}/classes`, { classIds: assignClasses });
      setTeacherMsg('Classes assigned!');
      setAssignTeacherId(null);
    } catch (err) {
      setTeacherMsg('Error assigning classes.');
    }
  };

  // Manage Subjects handlers
  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/subjects', { name: newSubject });
      const res = await axios.get('http://localhost:5000/api/subjects');
      setSubjects(res.data);
      setSubjectMsg('Subject added!');
      setNewSubject('');
    } catch (err) {
      setSubjectMsg('Error adding subject.');
    }
  };

  const handleDeleteSubject = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/subjects/${id}`);
      const res = await axios.get('http://localhost:5000/api/subjects');
      setSubjects(res.data);
    } catch (err) {
      setSubjectMsg('Error deleting subject.');
    }
  };

  // Manage Sessions/Terms handlers
  const handleAddSession = async (e) => {
    e.preventDefault();
    if (!newSession.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/sessions', { name: newSession });
      setSessions([...sessions, { name: newSession }]);
      setSessionMsg('Session added!');
      setNewSession('');
    } catch (err) {
      setSessionMsg('Error adding session.');
    }
  };

  const handleDeleteSession = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/sessions/${id}`);
      setSessions(sessions.filter(s => s.id !== id));
    } catch (err) {
      setSessionMsg('Error deleting session.');
    }
  };

  const handleHistoryFilterChange = (e) => {
    setHistoryFilters({ ...historyFilters, [e.target.name]: e.target.value });
  };

  const approveResults = (student_id, term, session) => {
    axios.post('http://localhost:5000/api/admin/approve-student-results', { student_id, term, session })
      .then(() => {
        setPendingStudents(pendingStudents.filter(
          s => !(s.student_id === student_id && s.term === term && s.session === session)
        ));
        setPendingModalOpen(false);
        alert('Results approved!');
      })
      .catch(() => alert('Failed to approve results.'));
  };

  const viewPendingResults = (student_id, term, session, student) => {
    axios.get(`http://localhost:5000/api/results?student_id=${student_id}&term=${term}&session=${session}`)
      .then(res => {
        setPendingModalResults(res.data);
        setPendingModalStudent(student);
        setPendingModalOpen(true);
      })
      .catch(() => {
        setPendingModalResults([]);
        setPendingModalStudent(student);
        setPendingModalOpen(true);
      });
  };

  // Handler for promoting a student
  const handlePromoteStudent = async (student_id) => {
    if (!sessions.length) {
      setPromotionMsg('No session available.');
      return;
    }
    // Use the latest session by default
    const session = sessions[sessions.length - 1].name || sessions[sessions.length - 1];
    try {
      const res = await axios.post(`http://localhost:5000/api/admin/students/${student_id}/promote`, { session });
      if (res.data.promoted) {
        setPromotionMsg(`Student promoted to ${res.data.newClass}`);
        // Optionally refresh students list
        if (selectedClass) {
          const refreshed = await axios.get(`http://localhost:5000/api/admin/students?class=${selectedClass}`);
          setStudentsList(refreshed.data);
        }
      } else {
        setPromotionMsg(res.data.reason || 'Not promoted.');
      }
    } catch (err) {
      setPromotionMsg('Promotion failed.');
    }
  };

  // Dummy panels for demonstration
  const renderPanel = () => {
    switch (activePanel) {
      case 'students':
        return (
          <div className="bg-white rounded shadow p-6 max-w-2xl">
            <h3 className="font-bold mb-2 text-green-700">Add/Edit Students</h3>
            <div className="mb-4 flex gap-2 items-center">
              <label className="font-semibold">Class:</label>
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="border p-2 rounded w-full md:w-48">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            {selectedClass && (
              <>
                <form onSubmit={studentForm.editId ? handleUpdateStudent : handleAddStudent} className="flex flex-col gap-2">
                  <input type="text" name="fullname" value={studentForm.fullname} onChange={handleStudentFormChange} placeholder="Full Name" className="border p-2 rounded w-full md:w-48" required />
                  <input type="text" name="student_id" value={studentForm.student_id} onChange={handleStudentFormChange} placeholder="Student ID" className="border p-2 rounded w-full md:w-32" required disabled={!!studentForm.editId} />
                  {studentForm.editId ? (
                    <input
                      type="password"
                      name="password"
                      value={studentForm.password}
                      onChange={handleStudentFormChange}
                      placeholder="New Password (leave blank to keep current)"
                      className="border p-2 rounded w-full md:w-32"
                    />
                  ) : (
                    <input type="password" name="password" value={studentForm.password} onChange={handleStudentFormChange} placeholder="Password" className="border p-2 rounded w-full md:w-32" required />
                  )}
                  <input type="file" name="photo" accept="image/*" onChange={e => setStudentForm({ ...studentForm, photo: e.target.files[0] })} className="border p-2 rounded" />
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold w-full md:w-auto">{studentForm.editId ? 'Update' : 'Add'}</button>
                  {studentMsg && <span className="text-green-700 ml-2">{studentMsg}</span>}
                </form>
                <div className="overflow-x-auto">
                <table className="min-w-[600px] bg-green-50 rounded">
                  <thead className="bg-green-200">
                    <tr>
                      <th className="py-2 px-4 text-left text-green-900">Full Name</th>
                      <th className="py-2 px-4 text-left text-green-900">Student ID</th>
                      <th className="py-2 px-4 text-left text-green-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.map(s => (
                      <tr key={s.id} className="border-b">
                        <td className="py-2 px-4">{s.fullname}</td>
                        <td className="py-2 px-4">{s.student_id}</td>
                        <td className="py-2 px-4">
                          <button className="text-blue-600 hover:underline mr-2" onClick={() => handleEditStudent(s)}>Edit</button>
                          <button className="text-green-600 hover:underline mr-2" onClick={() => handlePromoteStudent(s.student_id)}>Promote</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                {promotionMsg && <div className="mt-2 text-sm text-green-700">{promotionMsg}</div>}
              </>
            )}
          </div>
        );
      case 'upload':
        return (
          <>
            <div className="bg-white rounded shadow p-6 mb-8 max-w-xl">
              <h3 className="font-bold mb-2 text-green-700">Upload Result for JSS2B - 2nd Term 2024/25</h3>
              <div className="flex items-center gap-2 mb-4">
                <select name="class" value={form.class} onChange={handleFormChange} className="border p-2 rounded w-full md:w-48" required>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <input type="file" accept=".csv" onChange={e => setCsvFile(e.target.files[0])} className="border p-2 rounded w-full" />
                <button className="bg-green-600 hover:bg-green-700 text-white p-2 rounded w-full md:w-auto" onClick={handleUpload}>Upload CSV</button>
              </div>
            </div>
            <div className="bg-white rounded shadow p-6 max-w-xl">
              <h3 className="font-bold mb-2 text-green-700">Add Dummy Result (Manual Entry)</h3>
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-2">
                <select name="class" value={form.class} onChange={handleFormChange} className="border p-2 rounded w-full" required>
                  <option value="">Select Class</option>
                  {classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <input type="text" name="student_id" value={form.student_id} readOnly className="w-full p-2 border rounded bg-gray-100" />
                <input type="text" name="subject" value={form.subject} onChange={handleFormChange} placeholder="Subject" className="w-full p-2 border rounded" required />
                <input type="number" name="score" value={form.score} onChange={handleFormChange} placeholder="Score" className="w-full p-2 border rounded" required />
                <input type="text" name="grade" value={form.grade} onChange={handleFormChange} placeholder="Grade (A/B/C/D/F)" className="w-full p-2 border rounded" required />
                <input type="text" name="term" value={form.term} onChange={handleFormChange} placeholder="Term" className="w-full p-2 border rounded" />
                <input type="text" name="session" value={form.session} onChange={handleFormChange} placeholder="Session" className="w-full p-2 border rounded" />
                <input type="number" name="ca1" value={form.ca1 || ''} onChange={handleFormChange} placeholder="CA1" className="border p-2 rounded" />
                <input type="number" name="ca2" value={form.ca2 || ''} onChange={handleFormChange} placeholder="CA2" className="border p-2 rounded" />
                <input type="number" name="ca3" value={form.ca3 || ''} onChange={handleFormChange} placeholder="CA3" className="border p-2 rounded" />
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold w-full md:w-auto">Add Result</button>
              </form>
              {message && <div className="mt-2 text-sm text-green-700">{message}</div>}
            </div>
          </>
        );
      case 'subjects':
        return (
          <div className="bg-white rounded shadow p-6 max-w-xl">
            <h3 className="font-bold mb-2 text-green-700">Manage Subjects</h3>
            <form onSubmit={handleAddSubject} className="flex gap-2 mb-4">
              <input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="New subject name" className="border p-2 rounded w-full" />
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold w-full md:w-auto">Add</button>
            </form>
            {subjectMsg && <div className="mb-2 text-green-700">{subjectMsg}</div>}
            <div className="overflow-x-auto">
            <ul className="divide-y">
              {subjects.map(s => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <span>{s.name}</span>
                  <button className="text-red-600 hover:underline" onClick={() => handleDeleteSubject(s.id)}>Delete</button>
                </li>
              ))}
            </ul>
            </div>
          </div>
        );
      case 'sessions':
        return (
          <div className="bg-white rounded shadow p-6 max-w-xl">
            <h3 className="font-bold mb-2 text-green-700">Manage Sessions/Terms</h3>
            <form onSubmit={handleAddSession} className="flex gap-2 mb-4">
              <input type="text" value={newSession} onChange={e => setNewSession(e.target.value)} placeholder="New session name" className="border p-2 rounded w-full" />
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold w-full md:w-auto">Add</button>
            </form>
            {sessionMsg && <div className="mb-2 text-green-700">{sessionMsg}</div>}
            <div className="overflow-x-auto">
            <ul className="divide-y">
              {sessions.map(s => (
                  <li key={s.id || s.name || s} className="flex items-center justify-between py-2">
                    <span>{s.name || s}</span>
                    <button className="text-red-600 hover:underline" onClick={() => handleDeleteSession(s.id || s.name || s)}>Delete</button>
                </li>
              ))}
            </ul>
            </div>
          </div>
        );
      case 'classes':
        return (
          <div className="bg-white rounded shadow p-6 max-w-xl">
            <h3 className="font-bold mb-2 text-green-700">Manage Classes</h3>
            <form onSubmit={handleAddClass} className="flex gap-2 mb-4">
              <input type="text" value={newClass} onChange={e => setNewClass(e.target.value)} placeholder="New class name" className="border p-2 rounded w-full" />
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold w-full md:w-auto">Add</button>
            </form>
            {classMsg && <div className="mb-2 text-green-700">{classMsg}</div>}
            <div className="overflow-x-auto">
            <ul className="divide-y">
              {classes.map(c => (
                <li key={c.name} className="flex items-center justify-between py-2">
                  <span>{c.name}</span>
                  <button className="text-red-600 hover:underline" onClick={() => handleDeleteClass(c.name)}>Delete</button>
                </li>
              ))}
            </ul>
            </div>
          </div>
        );
      case 'history':
        return (
          <div className="bg-white rounded shadow p-6 max-w-xl">
            <h3 className="font-bold mb-2 text-green-700">View Result History</h3>
            <div className="flex gap-2 mb-4">
              <input type="text" name="student_id" value={historyFilters.student_id} onChange={handleHistoryFilterChange} placeholder="Student ID" className="border p-2 rounded w-full md:w-32" />
              <input type="text" name="class" value={historyFilters.class} onChange={handleHistoryFilterChange} placeholder="Class" className="border p-2 rounded w-full md:w-24" />
              <input type="text" name="term" value={historyFilters.term} onChange={handleHistoryFilterChange} placeholder="Term" className="border p-2 rounded w-full md:w-24" />
              <input type="text" name="session" value={historyFilters.session} onChange={handleHistoryFilterChange} placeholder="Session" className="border p-2 rounded w-full md:w-24" />
            </div>
            <div className="overflow-x-auto">
            <table className="min-w-[600px] bg-green-50 rounded">
              <thead className="bg-green-200">
                <tr>
                  <th className="py-2 px-4 text-left text-green-900">Student ID</th>
                    <th className="py-2 px-4 text-left text-green-900">Class(es)</th>
                    <th className="py-2 px-4 text-left text-green-900">See More</th>
                  </tr>
                </thead>
                <tbody>
                  {historyStudents.map(s => (
                    <tr key={s.student_id} className="border-b">
                      <td className="py-2 px-4">{s.student_id}</td>
                      <td className="py-2 px-4">{s.classes}</td>
                      <td className="py-2 px-4">
                        <button className="text-blue-600 hover:underline" onClick={() => { setHistoryModalStudent(s); setHistoryModalResults(s.results); setHistoryModalOpen(true); }}>See More</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Modal for student results */}
            {historyModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                <div className="bg-white rounded shadow-lg p-6 max-w-2xl w-full relative">
                  <button className="absolute top-2 right-2 text-2xl" onClick={() => setHistoryModalOpen(false)}>&times;</button>
                  <h4 className="font-bold mb-4 text-green-700">Results for {historyModalStudent.student_id}</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-green-50 rounded">
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
                  <th className="py-2 px-4 text-left text-green-900">Term</th>
                  <th className="py-2 px-4 text-left text-green-900">Session</th>
                          <th className="py-2 px-4 text-left text-green-900">Class</th>
                </tr>
              </thead>
              <tbody>
                        {historyModalResults.map((r, idx) => (
                          <tr key={r.id || idx} className="border-b">
                    <td className="py-2 px-4">{r.subject}</td>
                    <td className="py-2 px-4">{r.ca1}</td>
                    <td className="py-2 px-4">{r.ca2}</td>
                    <td className="py-2 px-4">{r.ca3}</td>
                    <td className="py-2 px-4">{r.score}</td>
                    <td className="py-2 px-4">{(Number(r.ca1 || 0) + Number(r.ca2 || 0) + Number(r.ca3 || 0) + Number(r.score || 0))}</td>
                    <td className="py-2 px-4">{r.grade}</td>
                    <td className="py-2 px-4">{r.remark}</td>
                    <td className="py-2 px-4">{r.term}</td>
                    <td className="py-2 px-4">{r.session}</td>
                            <td className="py-2 px-4">{r.class}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'manageTeachers':
        return (
          <div className="bg-white rounded shadow p-6 max-w-2xl">
            <h3 className="font-bold mb-2 text-green-700">Manage Teachers</h3>
            <form onSubmit={handleAddTeacher} className="flex gap-2 mb-4 flex-wrap">
              <input type="text" name="fullname" value={teacherForm.fullname} onChange={handleTeacherFormChange} placeholder="Full Name" className="border p-2 rounded w-full md:w-48" required />
              <input type="email" name="email" value={teacherForm.email} onChange={handleTeacherFormChange} placeholder="Email" className="border p-2 rounded w-full md:w-48" required />
              <input type="password" name="password" value={teacherForm.password} onChange={handleTeacherFormChange} placeholder={teacherForm.editId ? 'New Password (optional)' : 'Password'} className="border p-2 rounded w-full md:w-48" required={!teacherForm.editId} />
              <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold w-full md:w-auto">{teacherForm.editId ? 'Update' : 'Add'}</button>
              {teacherMsg && <span className="text-green-700 ml-2">{teacherMsg}</span>}
            </form>
            <div className="overflow-x-auto">
            <table className="min-w-[600px] bg-green-50 rounded mb-4">
              <thead className="bg-green-200">
                <tr>
                  <th className="py-2 px-4 text-left text-green-900">Full Name</th>
                  <th className="py-2 px-4 text-left text-green-900">Email</th>
                  <th className="py-2 px-4 text-left text-green-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(t => (
                  <tr key={t.id} className="border-b">
                    <td className="py-2 px-4">{t.fullname}</td>
                    <td className="py-2 px-4">{t.email}</td>
                    <td className="py-2 px-4">
                      <button className="text-blue-600 hover:underline mr-2" onClick={() => handleEditTeacher(t)}>Edit</button>
                      <button className="text-green-600 hover:underline mr-2" onClick={() => handleAssignClasses(t)}>Assign Classes</button>
                      <button className="text-red-600 hover:underline" onClick={() => handleDeleteTeacher(t.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {assignTeacherId && (
              <div className="mb-4 p-4 border rounded bg-green-50">
                <h4 className="font-bold mb-2">Assign Classes</h4>
                <div className="flex flex-wrap gap-4 mb-2">
                  {classes.map(c => (
                    <label key={c.id} className="flex items-center gap-2">
                      <input type="checkbox" checked={assignClasses.includes(c.id)} onChange={() => handleClassCheckbox(c.id)} />
                      {c.name}
                    </label>
                  ))}
                </div>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold w-full md:w-auto" onClick={handleSaveAssignedClasses}>Save</button>
                <button className="ml-2 text-red-600 hover:underline" onClick={() => setAssignTeacherId(null)}>Cancel</button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-green-50 flex-col md:flex-row">
      {/* Hamburger for mobile */}
      <div className="md:hidden flex items-center justify-between bg-green-700 text-white p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-white text-green-700 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl border-2 border-green-300">B</div>
          <span className="text-xl font-extrabold tracking-wide">Dandeb School</span>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="text-3xl focus:outline-none">&#9776;</button>
      </div>
      {/* Sidebar */}
      <nav className={`fixed md:static top-0 left-0 h-full z-40 bg-green-700 text-white min-h-screen p-4 md:p-6 flex flex-col justify-between shadow-lg w-64 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`} style={{ maxWidth: '100vw' }}>
        <div>
          <div className="mb-4 md:mb-8 flex items-center gap-2">
            <div className="bg-white text-green-700 rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl border-2 border-green-300">B</div>
            <span className="text-xl md:text-2xl font-extrabold tracking-wide">Dandeb School</span>
          </div>
          <ul className="space-y-2 md:space-y-4 flex flex-row md:flex-col flex-wrap md:flex-nowrap">
            {NAV_ITEMS.map(item => (
              <li
                key={item.key}
                className={`font-semibold cursor-pointer px-2 py-1 rounded ${activePanel === item.key ? 'bg-green-900 text-green-200' : 'hover:text-green-200'}`}
                onClick={() => { setActivePanel(item.key); setSidebarOpen(false); }}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="w-full md:w-auto flex justify-end md:justify-start">
          <button className="w-full bg-green-600 hover:bg-green-800 py-2 rounded text-white font-semibold mt-2 md:mt-8" onClick={() => { localStorage.clear(); window.location = '/'; }}>Logout</button>
        </div>
        {/* Close button for mobile */}
        <button onClick={() => setSidebarOpen(false)} className="md:hidden absolute top-4 right-4 text-3xl focus:outline-none">&times;</button>
      </nav>
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden" onClick={() => setSidebarOpen(false)}></div>}
      {/* Main Content */}
      <main className="flex-1 p-2 md:p-10 w-full">
        <h2 className="text-2xl md:text-3xl font-extrabold text-green-800 mb-4 md:mb-6 flex items-center gap-2">
          <span className="bg-green-100 text-green-700 px-2 md:px-3 py-1 rounded-full font-bold text-lg">Admin</span>
          Dashboard
        </h2>
        <div className="overflow-x-auto">
        {renderPanel()}
        </div>
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Pending Results Approval</h2>
          <div className="bg-white rounded shadow p-4 mb-8">
            {pendingStudents.length === 0 ? (
              <div className="text-green-700">No pending results to approve.</div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="py-2 px-4 text-left">Student</th>
                    <th className="py-2 px-4 text-left">Class</th>
                    <th className="py-2 px-4 text-left">Term</th>
                    <th className="py-2 px-4 text-left">Session</th>
                    <th className="py-2 px-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingStudents.map(s => (
                    <tr key={s.student_id + s.term + s.session}>
                      <td className="py-2 px-4">{s.fullname}</td>
                      <td className="py-2 px-4">{s.class}</td>
                      <td className="py-2 px-4">{s.term}</td>
                      <td className="py-2 px-4">{s.session}</td>
                      <td className="py-2 px-4 flex gap-2">
                        <button
                          className="bg-blue-600 hover:bg-blue-800 text-white px-3 py-1 rounded"
                          onClick={() => viewPendingResults(s.student_id, s.term, s.session, s)}
                        >
                          View
                        </button>
                        <button
                          className="bg-green-600 hover:bg-green-800 text-white px-3 py-1 rounded"
                          onClick={() => approveResults(s.student_id, s.term, s.session)}
                        >
                          Approve Results
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {/* Modal for pending result details */}
        {pendingModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 relative w-full max-w-xl">
              <button className="absolute top-2 right-2 text-2xl" onClick={() => setPendingModalOpen(false)}>&times;</button>
              <h4 className="font-bold mb-4 text-green-700">Pending Results for {pendingModalStudent?.fullname} ({pendingModalStudent?.student_id})</h4>
              {pendingModalResults.length === 0 ? (
                <div className="text-red-600">No results found for this student/term/session.</div>
              ) : (
                <table className="min-w-full mb-4">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 text-left">Subject</th>
                      <th className="py-2 px-4 text-left">Score</th>
                      <th className="py-2 px-4 text-left">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingModalResults.map((r, idx) => (
                      <tr key={r.subject + idx}>
                        <td className="py-2 px-4">{r.subject}</td>
                        <td className="py-2 px-4">{r.score}</td>
                        <td className="py-2 px-4">{r.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button
                className="bg-green-600 hover:bg-green-800 text-white px-4 py-2 rounded"
                onClick={() => approveResults(pendingModalStudent.student_id, pendingModalStudent.term, pendingModalStudent.session)}
              >
                Approve Results
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 