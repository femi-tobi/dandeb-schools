import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState({});
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [results, setResults] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [message, setMessage] = useState('');
  const [students, setStudents] = useState([]);
  const [subject, setSubject] = useState('');
  const [term, setTerm] = useState('');
  const [session, setSession] = useState('');
  const [resultInputs, setResultInputs] = useState({}); // { student_id: { score, grade } }
  const [resultMsg, setResultMsg] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [caScores, setCaScores] = useState({});
  const [examScores, setExamScores] = useState({});
  const [selectedSubjects, setSelectedSubjects] = useState({});
  const [manualGrades, setManualGrades] = useState({});
  const [saveMsg, setSaveMsg] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStudent, setModalStudent] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [studentEdits, setStudentEdits] = useState({}); // { resultId: { ca1, ca2, score, grade, remark } }
  const [modalSubject, setModalSubject] = useState('');
  const [modalCA, setModalCA] = useState('');
  const [modalExam, setModalExam] = useState('');
  const [modalGrade, setModalGrade] = useState('');
  const [modalMsg, setModalMsg] = useState('');
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newModalSubject, setNewModalSubject] = useState('');
  const [addSubjectMsg, setAddSubjectMsg] = useState('');
  const [lastAddedSubject, setLastAddedSubject] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('enter');
  const [historyFilters, setHistoryFilters] = useState({ student_id: '', subject: '', term: '', session: '' });
  const [historyResults, setHistoryResults] = useState([]);
  const [remark, setRemark] = useState('');
  const [remarkMsg, setRemarkMsg] = useState('');
  const [gradeScores, setGradeScores] = useState({});

  // Grade mapping function - returns grade code given a numeric percentage/total
  const getGrade = (percent) => {
    let p = parseFloat(String(percent).trim());
    if (Number.isNaN(p)) return '';
    // if value looks like a fraction (0.9) assume it's a 0-1 ratio and convert to percentage
    if (p > 0 && p <= 1) p = p * 100;
    // round to nearest integer and clamp to 0-100
    p = Math.round(p);
    if (p < 0) p = 0;
    if (p > 100) p = 100;
    console.debug('[getGrade] input:', percent, 'normalizedInt:', p);
    // explicit integer ranges (inclusive)
    if (p >= 75 && p <= 100) return 'A1';
    if (p >= 70 && p <= 74) return 'B2';
    if (p >= 65 && p <= 69) return 'B3';
    if (p >= 60 && p <= 64) return 'C6';
    if (p >= 55 && p <= 59) return 'D7';
    if (p >= 50 && p <= 54) return 'E8';
    return 'F9';
  };

  // Handlers that update CA/Exam and compute grade for the student immediately
  const handleCaChange = (studentId, value) => {
    setCaScores(prev => {
      const next = { ...prev, [studentId]: value };
      const ca = Number(next[studentId] || 0);
      const exam = Number(examScores[studentId] || 0);
      const total = (isNaN(ca) ? 0 : ca) + (isNaN(exam) ? 0 : exam);
      const totalInt = Math.round(total);
      const grade = total === 0 && value === '' && (examScores[studentId] === '' || examScores[studentId] === undefined) ? '' : getGrade(totalInt);
      console.debug('[handleCaChange] student:', studentId, 'ca:', ca, 'exam:', exam, 'total:', total, 'grade:', grade);
      setGradeScores(gPrev => ({ ...gPrev, [studentId]: grade }));
      return next;
    });
  };

  const handleExamChange = (studentId, value) => {
    setExamScores(prev => {
      const next = { ...prev, [studentId]: value };
      const ca = Number(caScores[studentId] || 0);
      const exam = Number(next[studentId] || 0);
      const total = (isNaN(ca) ? 0 : ca) + (isNaN(exam) ? 0 : exam);
      const totalInt = Math.round(total);
      const grade = total === 0 && value === '' && (caScores[studentId] === '' || caScores[studentId] === undefined) ? '' : getGrade(totalInt);
      console.debug('[handleExamChange] student:', studentId, 'ca:', ca, 'exam:', exam, 'total:', total, 'grade:', grade);
      setGradeScores(gPrev => ({ ...gPrev, [studentId]: grade }));
      return next;
    });
  };

  

 useEffect(() => {
    document.title = 'Teacher Dashboard – Dandeb School';
  }, []);

  useEffect(() => {
    const teacherData = localStorage.getItem('teacher');
    if (!teacherData) return;
    const teacherObj = JSON.parse(teacherData);
    setTeacher(teacherObj);
    // Fetch assigned classes
    axios.get(`http://localhost:5000/api/admin/teachers/${teacherObj.id}/classes`)
      .then(res => setClasses(res.data))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    // Fetch results for selected class
    axios.get(`http://localhost:5000/api/results?class=${selectedClass}`)
      .then(res => setResults(res.data))
      .catch(() => setResults([]));
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass || !teacher.id) return;
    axios.get(`http://localhost:5000/api/admin/teachers/${teacher.id}/students`)
      .then(res => {
        // Filter students for the selected class
        setStudents(res.data.filter(s => s.class === selectedClass));
      })
      .catch(() => setStudents([]));
  }, [selectedClass, teacher.id]);

  // Fetch results for selected class, subject, term, session
  useEffect(() => {
    if (!selectedClass || !subject || !term || !session) return;
    axios.get(`http://localhost:5000/api/results?class=${selectedClass}&subject=${subject}&term=${term}&session=${session}`)
      .then(res => {
        // Map results by student_id for quick lookup
        const map = {};
        res.data.forEach(r => { map[r.student_id] = r; });
        setResultInputs(students.reduce((acc, s) => {
          acc[s.student_id] = map[s.student_id] ? { score: map[s.student_id].score, grade: map[s.student_id].grade } : { score: '', grade: '' };
          return acc;
        }, {}));
      })
      .catch(() => setResultInputs({}));
  }, [selectedClass, subject, term, session, students]);

  // Fetch subjects on mount
  useEffect(() => {
    axios.get('http://localhost:5000/api/subjects')
      .then(res => setSubjects(res.data))
      .catch(() => setSubjects([]));
  }, []);

  // Fetch result history when filters or selectedClass change and tab is 'history'
  useEffect(() => {
    if (activeTab !== 'history' || !selectedClass) return;
    let url = `http://localhost:5000/api/results?class=${selectedClass}`;
    if (historyFilters.student_id) url += `&student_id=${historyFilters.student_id}`;
    if (historyFilters.subject) url += `&subject=${historyFilters.subject}`;
    if (historyFilters.term) url += `&term=${historyFilters.term}`;
    if (historyFilters.session) url += `&session=${historyFilters.session}`;
    axios.get(url)
      .then(res => setHistoryResults(res.data))
      .catch(() => setHistoryResults([]));
  }, [activeTab, selectedClass, historyFilters]);

  // Handle input change for result form
  const handleResultInputChange = (student_id, field, value) => {
    setResultInputs(prev => ({
      ...prev,
      [student_id]: {
        ...prev[student_id],
        [field]: value
      }
    }));
  };

  // Handle submit for a student's result
  const handleResultSubmit = async (student_id) => {
    if (!subject || !term || !session) {
      setResultMsg('Please select subject, term, and session.');
      return;
    }
    const { score } = resultInputs[student_id] || {};
    // prefer computed grade from gradeScores, fallback to manual input
    const computedGrade = gradeScores[student_id] || (resultInputs[student_id] && resultInputs[student_id].grade) || '';
    // Allow partial submission: at least one of CA or exam or grade must be present
    const ca = caScores[student_id] || '';
    if ((ca === '' || ca === undefined) && (score === '' || score === undefined) && !computedGrade) {
      setResultMsg('Enter at least one of CA or Exam or Grade to submit.');
      return;
    }
    try {
      console.debug('[handleResultSubmit] posting result for', student_id, { subject, score, grade: computedGrade, term, session, class: selectedClass });
      await axios.post('http://localhost:5000/api/results/manual', {
        student_id,
        subject,
        ca1: ca !== '' ? ca : undefined,
        score: (score !== '' && score !== undefined) ? score : undefined,
        grade: computedGrade || undefined,
        term,
        session,
        class: selectedClass
      });
      setResultMsg('Result submitted (pending admin approval). You can edit it later.');
    } catch (err) {
      setResultMsg('Error saving result.');
    }
  };

  const handleUpload = async () => {
    if (!csvFile || !selectedClass) {
      setMessage('Please select a class and choose a file.');
      return;
    }
    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('class', selectedClass);
    try {
      await axios.post('http://localhost:5000/api/results/upload', formData);
      setMessage('Results uploaded!');
      // Refresh results
      const res = await axios.get(`http://localhost:5000/api/results?class=${selectedClass}`);
      setResults(res.data);
    } catch (err) {
      setMessage('Error uploading results.');
    }
  };

  const openStudentModal = async (student) => {
    setModalStudent(student);
    setModalOpen(true);
    // Fetch results for this student for the current class/term/session
    try {
      const res = await axios.get(`http://localhost:5000/api/results?student_id=${student.student_id}&class=${selectedClass}&term=${term}&session=${session}`);
      setStudentResults(res.data);
      // prepare editable copy
      const edits = {};
      res.data.forEach(r => {
        edits[r.id] = { ca1: r.ca1 ?? '', ca2: r.ca2 ?? '', score: r.score ?? '', grade: r.grade ?? '', remark: r.remark ?? '' };
      });
      setStudentEdits(edits);
    } catch {
      setStudentResults([]);
    }
    // Fetch existing remark
    try {
      const r = await axios.get(`http://localhost:5000/api/remarks?student_id=${student.student_id}&class=${selectedClass}&term=${term}&session=${session}`);
      setRemark(r.data?.remark || '');
    } catch {
      setRemark('');
    }
    setBatchResults([]);
    setModalMsg('');
    setRemarkMsg('');
  };
  const closeStudentModal = () => {
    setModalOpen(false);
    setModalStudent(null);
    setStudentResults([]);
    setBatchResults([]);
    setModalMsg('');
  };
  const handleAddBatchRow = () => {
    setBatchResults(prev => [...prev, { subject: '', ca1: '', ca2: '', exam: '', grade: '', remark: '' }]);
  };
  const handleBatchRowChange = (idx, field, value) => {
    setBatchResults(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };
  const handleRemoveBatchRow = (idx) => {
    setBatchResults(prev => prev.filter((_, i) => i !== idx));
  };
  const handleSubmitBatchResults = async () => {
    // Prevent duplicate subjects in the batch or with existing results
    const allSubjects = [
      ...studentResults.map(r => r.subject),
      ...batchResults.map(r => r.subject)
    ];
    const hasDuplicates = new Set(batchResults.map(r => r.subject)).size !== batchResults.length;
    const hasExisting = batchResults.some(r => studentResults.some(sr => sr.subject === r.subject));
    if (hasDuplicates) {
      setModalMsg('Duplicate subjects in batch.');
      return;
    }
    if (hasExisting) {
      setModalMsg('One or more subjects already have results for this student in this session/term/class.');
      return;
    }
    // Allow partial batch rows: require subject at minimum and at least one of ca1/ca2/exam/grade
    for (const r of batchResults) {
      if (!r.subject) {
        setModalMsg('Each row must have a subject.');
        return;
      }
      if ((r.ca1 === '' || r.ca1 === undefined) && (r.ca2 === '' || r.ca2 === undefined) && (r.exam === '' || r.exam === undefined) && !(r.grade)) {
        setModalMsg('Each row must have at least one score or a grade.');
        return;
      }
    }
    try {
      for (const row of batchResults) {
        // compute fallback grade in case it's missing
        const ca1 = (row.ca1 !== undefined && row.ca1 !== '') ? Number(row.ca1) : undefined;
        const ca2 = (row.ca2 !== undefined && row.ca2 !== '') ? Number(row.ca2) : undefined;
        const exam = (row.exam !== undefined && row.exam !== '') ? Number(row.exam) : undefined;
        const total = (Number(ca1 || 0) + Number(ca2 || 0) + Number(exam || 0));
        const gradeToSend = row.grade || (total ? getGrade(Math.round(total)) : undefined);
        console.debug('[handleSubmitBatchResults] posting row for', modalStudent.student_id, { subject: row.subject, ca1, ca2, exam, total, grade: gradeToSend, term, session, class: selectedClass });
        await axios.post('http://localhost:5000/api/results/manual', {
          student_id: modalStudent.student_id,
          subject: row.subject,
          ca1: ca1,
          ca2: ca2,
          score: exam,
          grade: gradeToSend,
          remark: row.remark || undefined,
          term,
          session,
          class: selectedClass
        });
      }
      // Refresh results
      const res = await axios.get(`http://localhost:5000/api/results?student_id=${modalStudent.student_id}&class=${selectedClass}&term=${term}&session=${session}`);
      setStudentResults(res.data);
      setBatchResults([]);
      setModalMsg('All results added!');
    } catch {
      setModalMsg('Error adding results.');
    }
  };

  const handleAddModalSubject = async () => {
    if (!newModalSubject.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/subjects', { name: newModalSubject });
      const res = await axios.get('http://localhost:5000/api/subjects');
      setSubjects(res.data);
      setModalSubject(newModalSubject);
      setShowAddSubject(false);
      setNewModalSubject('');
      setAddSubjectMsg('Subject added!');
    } catch {
      setAddSubjectMsg('Error adding subject.');
    }
  };

  const handleHistoryFilterChange = (e) => {
    setHistoryFilters({ ...historyFilters, [e.target.name]: e.target.value });
  };

  const TERMS = ['1st Term', '2nd Term', '3rd Term'];
  const [sessions, setSessions] = useState([]);

  // Fetch sessions on mount
  useEffect(() => {
    axios.get('http://localhost:5000/api/sessions')
      .then(res => {
        setSessions(res.data || []);
      })
      .catch(() => setSessions([]));
  }, []);

  const handleSaveRemark = async () => {
    if (!remark.trim()) {
      setRemarkMsg('Remark cannot be empty.');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/remarks', {
        student_id: modalStudent.student_id,
        class: selectedClass,
        term,
        session,
        remark
      });
      setRemarkMsg('Remark saved!');
    } catch {
      setRemarkMsg('Error saving remark.');
    }
  };

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header Bar */}
      <header className="bg-green-700 text-white flex items-center justify-between px-8 py-4 shadow">
        <div className="flex items-center gap-4">
          <div className="bg-white text-green-700 rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold border-2 border-green-300">
            {teacher.fullname ? teacher.fullname.split(' ').map(n => n[0]).join('').toUpperCase() : ''}
          </div>
          <div>
            <div className="font-bold text-lg">Welcome, {teacher.fullname}</div>
            <div className="text-sm text-green-200">Dandeb School Teacher</div>
          </div>
        </div>
        <button className="bg-green-600 hover:bg-green-800 px-4 py-2 rounded text-white font-semibold" onClick={() => { localStorage.clear(); window.location = '/teacher-login'; }}>Logout</button>
      </header>
      <main className="max-w-3xl mx-auto mt-8 p-4">
        {/* Class selection and main dashboard content here */}
        <div className="mb-6">
          <label className="font-semibold text-green-800">Select Class:</label>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="p-2 rounded border-green-300 border focus:outline-none ml-2"
          >
            <option value="">-- Select --</option>
            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        {!selectedClass && (
          <div className="text-center text-green-700 font-semibold mt-8">
            Please select a class to view and enter results.
          </div>
        )}
        {selectedClass && (
          <>
            {/* Tab Navigation */}
            <div className="flex gap-4 mb-6">
              <button
                className={`px-4 py-2 rounded font-semibold ${activeTab === 'enter' ? 'bg-green-700 text-white' : 'bg-green-100 text-green-800'}`}
                onClick={() => setActiveTab('enter')}
              >
                Enter Results
              </button>
              <button
                className={`px-4 py-2 rounded font-semibold ${activeTab === 'history' ? 'bg-green-700 text-white' : 'bg-green-100 text-green-800'}`}
                onClick={() => setActiveTab('history')}
              >
                View Result History
              </button>
            </div>
            {/* Enter Results Panel */}
            {activeTab === 'enter' && (
              <div className="overflow-x-auto">
                <div className="bg-white rounded shadow p-2 md:p-6 mb-4 md:mb-8">
                  <h3 className="font-bold mb-2 text-green-700 text-base md:text-lg">Students in {selectedClass}</h3>
                  <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-4">
                    <select value={term} onChange={e => setTerm(e.target.value)} className="border p-2 rounded w-full md:w-32">
                      <option value="">Select Term</option>
                      {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={session} onChange={e => setSession(e.target.value)} className="border p-2 rounded w-full md:w-32">
                      <option value="">Select Session</option>
                      {sessions.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <table className="min-w-[600px] w-full">
                    <thead className="bg-green-200">
                      <tr>
                        <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Full Name</th>
                        <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">CA Score</th>
                        <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Exam Score</th>
                        <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Total</th>
                        <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => {
                        const ca = caScores[s.student_id] || '';
                        const exam = examScores[s.student_id] || '';
                        const total = ca && exam ? Number(ca) + Number(exam) : '';
                        return (
                          <tr key={s.id}>
                            <td className="py-2 px-2 md:px-4">{s.fullname}</td>
                            <td className="py-2 px-2 md:px-4">
                              <input
                                type="number"
                                value={ca}
                                onChange={e => handleCaChange(s.student_id, e.target.value)}
                                className="border p-1 rounded w-full md:w-20"
                              />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <input
                                type="number"
                                value={exam}
                                onChange={e => handleExamChange(s.student_id, e.target.value)}
                                className="border p-1 rounded w-full md:w-20"
                              />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <input
                                type="number"
                                value={total}
                                readOnly
                                className="border p-1 rounded w-full md:w-20 bg-gray-100"
                              />
                              <div className="text-sm text-green-800 mt-1">{gradeScores[s.student_id] || ''} {total !== '' ? `(${total})` : ''}</div>
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <button className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded w-full md:w-auto" onClick={() => openStudentModal(s)}>View/Add Results</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Modal
                  isOpen={modalOpen}
                  onRequestClose={closeStudentModal}
                  contentLabel="Student Results Modal"
                  ariaHideApp={false}
                  className="bg-white rounded shadow p-2 md:p-6 max-w-3xl w-full mx-auto mt-10 md:mt-20 outline-none overflow-x-auto"
                  overlayClassName="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center"
                >
                  <h3 className="font-bold mb-2 text-green-700 text-base md:text-lg">Results for {modalStudent?.fullname}</h3>
                  <div className="mb-4 overflow-x-auto">
                    <table className="min-w-[400px] w-full mb-2">
                      <thead className="bg-green-200">
                        <tr>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Subject</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">CA1</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">CA2</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Exam</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Total</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Grade</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentResults.map(r => (
                          <tr key={r.id}>
                            <td className="py-2 px-2 md:px-4">{r.subject}</td>
                            <td className="py-2 px-2 md:px-4">
                              <input type="number" value={studentEdits[r.id]?.ca1 ?? ''} onChange={e => setStudentEdits(prev => ({ ...prev, [r.id]: { ...prev[r.id], ca1: e.target.value } }))} className="border p-1 rounded w-full md:w-20" />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <input type="number" value={studentEdits[r.id]?.ca2 ?? ''} onChange={e => setStudentEdits(prev => ({ ...prev, [r.id]: { ...prev[r.id], ca2: e.target.value } }))} className="border p-1 rounded w-full md:w-20" />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <input type="number" value={studentEdits[r.id]?.score ?? ''} onChange={e => setStudentEdits(prev => ({ ...prev, [r.id]: { ...prev[r.id], score: e.target.value } }))} className="border p-1 rounded w-full md:w-20" />
                            </td>
                            <td className="py-2 px-2 md:px-4">{(Number(studentEdits[r.id]?.ca1 || 0) + Number(studentEdits[r.id]?.ca2 || 0) + Number(r.ca3 || 0) + Number(studentEdits[r.id]?.score || 0))}</td>
                            <td className="py-2 px-2 md:px-4">
                              <input type="text" value={studentEdits[r.id]?.grade ?? ''} onChange={e => setStudentEdits(prev => ({ ...prev, [r.id]: { ...prev[r.id], grade: e.target.value } }))} className="border p-1 rounded w-full md:w-20" />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <input type="text" value={studentEdits[r.id]?.remark ?? ''} onChange={e => setStudentEdits(prev => ({ ...prev, [r.id]: { ...prev[r.id], remark: e.target.value } }))} className="border p-1 rounded w-full md:w-24" />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded mr-2" onClick={async () => {
                                try {
                                  const payload = { ca1: studentEdits[r.id]?.ca1, ca2: studentEdits[r.id]?.ca2, score: studentEdits[r.id]?.score, grade: studentEdits[r.id]?.grade, remark: studentEdits[r.id]?.remark };
                                  await axios.put(`http://localhost:5000/api/results/manual/${r.id}`, payload);
                                  // Refresh results
                                  const res = await axios.get(`http://localhost:5000/api/results?student_id=${modalStudent.student_id}&class=${selectedClass}&term=${term}&session=${session}`);
                                  setStudentResults(res.data);
                                  const edits = {};
                                  res.data.forEach(rr => { edits[rr.id] = { ca1: rr.ca1 ?? '', ca2: rr.ca2 ?? '', score: rr.score ?? '', grade: rr.grade ?? '', remark: rr.remark ?? '' }; });
                                  setStudentEdits(edits);
                                  setModalMsg('Result updated and pending approval.');
                                } catch (err) {
                                  setModalMsg('Error updating result.');
                                }
                              }}>Save</button>
                              <span className="text-sm text-gray-600">{r.approved ? 'Approved' : 'Pending'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mb-4 overflow-x-auto">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded mb-2 w-full md:w-auto" onClick={handleAddBatchRow}>+ Add Subject Row</button>
                    <table className="min-w-[600px] w-full">
                      <thead className="bg-green-100">
                        <tr>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Subject</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">CA1</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">CA2</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Exam</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Total</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Grade</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Remark</th>
                          <th className="py-2 px-2 md:px-4 text-left text-green-900 text-xs md:text-base">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchResults.map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-2 md:px-4">
                              <select value={row.subject} onChange={e => handleBatchRowChange(idx, 'subject', e.target.value)} className="border p-2 rounded w-full md:w-32">
                                <option value="">Select Subject</option>
                                {subjects.map(sub => (
                                  <option key={sub.id + '-' + sub.name} value={sub.name}>{sub.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <input type="number" value={row.ca1 || ''} onChange={e => { handleBatchRowChange(idx, 'ca1', e.target.value); /* compute grade for batch row */ const ca = Number((e.target.value) || 0); const ex = Number(row.exam || 0); const tot = (isNaN(ca) ? 0 : ca) + (isNaN(ex) ? 0 : ex); const totInt = Math.round(tot); handleBatchRowChange(idx, 'grade', tot === 0 && e.target.value === '' && (row.exam === '' || row.exam === undefined) ? '' : getGrade(totInt)); }} className="border p-2 rounded w-full md:w-16" />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <input type="number" value={row.ca2 || ''} onChange={e => handleBatchRowChange(idx, 'ca2', e.target.value)} className="border p-2 rounded w-full md:w-16" />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <input type="number" value={row.exam || ''} onChange={e => { handleBatchRowChange(idx, 'exam', e.target.value); const ca = Number(row.ca1 || 0); const ex = Number(e.target.value || 0); const tot = (isNaN(ca) ? 0 : ca) + (isNaN(ex) ? 0 : ex); const totInt = Math.round(tot); handleBatchRowChange(idx, 'grade', tot === 0 && e.target.value === '' && (row.ca1 === '' || row.ca1 === undefined) ? '' : getGrade(totInt)); }} className="border p-2 rounded w-full md:w-16" />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <input type="number" value={(Number(row.ca1 || 0) + Number(row.ca2 || 0) + Number(row.exam || 0)) || ''} readOnly className="border p-2 rounded w-full md:w-16 bg-gray-100" />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <input type="text" value={row.grade || ''} onChange={e => handleBatchRowChange(idx, 'grade', e.target.value)} className="border p-2 rounded w-full md:w-16" />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <input type="text" value={row.remark || ''} onChange={e => handleBatchRowChange(idx, 'remark', e.target.value)} className="border p-2 rounded w-full md:w-24" />
                            </td>
                            <td className="py-2 px-2 md:px-4">
                              <button className="text-red-600 hover:underline w-full md:w-auto" onClick={() => handleRemoveBatchRow(idx)}>Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {batchResults.length > 0 && (
                      <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold mt-2 w-full md:w-auto" onClick={handleSubmitBatchResults}>Submit All</button>
                    )}
                  </div>
                  {modalMsg && <div className="text-green-700 mb-2">{modalMsg}</div>}
                  <div className="mt-6">
                    <label className="font-semibold text-green-800">Report Card Remark:</label>
                    <textarea
                      value={remark}
                      onChange={e => setRemark(e.target.value)}
                      className="border p-2 rounded w-full min-h-[60px] mt-2"
                      placeholder="Enter overall remark for this student for this term/session..."
                    />
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold mt-2" onClick={handleSaveRemark}>Save Remark</button>
                    {remarkMsg && <div className="text-green-700 mt-1">{remarkMsg}</div>}
                  </div>
                  <button className="mt-2 text-red-600 hover:underline w-full md:w-auto" onClick={closeStudentModal}>Close</button>
                </Modal>
              </div>
            )}
            {/* Result History Panel */}
            {activeTab === 'history' && (
              <div className="bg-white rounded shadow p-6 mt-4">
                <h3 className="font-bold mb-2 text-green-700">Result History for {selectedClass}</h3>
                <div className="flex gap-2 mb-4 flex-wrap">
                  <input type="text" name="student_id" value={historyFilters.student_id} onChange={handleHistoryFilterChange} placeholder="Student ID" className="border p-2 rounded w-32" />
                  <input type="text" name="subject" value={historyFilters.subject} onChange={handleHistoryFilterChange} placeholder="Subject" className="border p-2 rounded w-32" />
                  <input type="text" name="term" value={historyFilters.term} onChange={handleHistoryFilterChange} placeholder="Term" className="border p-2 rounded w-32" />
                  <input type="text" name="session" value={historyFilters.session} onChange={handleHistoryFilterChange} placeholder="Session" className="border p-2 rounded w-32" />
            </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[600px] w-full bg-green-50 rounded">
                <thead className="bg-green-200">
                  <tr>
                    <th className="py-2 px-4 text-left text-green-900">Student ID</th>
                    <th className="py-2 px-4 text-left text-green-900">Subject</th>
                    <th className="py-2 px-4 text-left text-green-900">Score</th>
                    <th className="py-2 px-4 text-left text-green-900">Grade</th>
                    <th className="py-2 px-4 text-left text-green-900">Term</th>
                    <th className="py-2 px-4 text-left text-green-900">Session</th>
                  </tr>
                </thead>
                <tbody>
                      {historyResults.map(r => (
                        <tr key={r.id}>
                      <td className="py-2 px-4">{r.student_id}</td>
                      <td className="py-2 px-4">{r.subject}</td>
                      <td className="py-2 px-4">{r.score}</td>
                      <td className="py-2 px-4">{r.grade}</td>
                      <td className="py-2 px-4">{r.term}</td>
                      <td className="py-2 px-4">{r.session}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}