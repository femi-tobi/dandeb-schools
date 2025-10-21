import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function AdminUpload() {
  const [term, setTerm] = useState('');
  const [session, setSession] = useState('');
  const [className, setClassName] = useState('');
  const [file, setFile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get('http://localhost:5000/api/sessions')
      .then(res => setSessions(res.data || []))
      .catch(() => setSessions([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!term || !session || !file) {
      setMessage('Term, session and file are required.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('term', term);
    form.append('session', session);
    if (className) form.append('class', className);
    try {
      const res = await axios.post('http://localhost:5000/api/results/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage(`Upload complete: inserted ${res.data.inserted} unmatched ${res.data.unmatchedCount}`);
    } catch (err) {
      setMessage('Upload failed.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="font-bold text-lg mb-4">Admin CSV Upload</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label>Term</label>
        <select value={term} onChange={e => setTerm(e.target.value)} className="border p-2 rounded">
          <option value="">Select Term</option>
          <option value="1st Term">1st Term</option>
          <option value="2nd Term">2nd Term</option>
          <option value="3rd Term">3rd Term</option>
        </select>
        <label>Session</label>
        <select value={session} onChange={e => setSession(e.target.value)} className="border p-2 rounded">
          <option value="">Select Session</option>
          {sessions.map(s => <option key={s.id || s.name} value={s.name}>{s.name}</option>)}
        </select>
        <label>Class (optional)</label>
        <input value={className} onChange={e => setClassName(e.target.value)} className="border p-2 rounded" placeholder="e.g., JSS1" />
        <label>CSV File</label>
        <input type="file" accept=".csv" onChange={e => setFile(e.target.files[0])} />
        <button className="bg-green-600 text-white p-2 rounded mt-2" type="submit">Upload</button>
      </form>
      {message && <div className="mt-2 text-sm text-green-700">{message}</div>}
    </div>
  );
}
