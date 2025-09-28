import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function TeacherLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/teacher/login', { email, password });
      localStorage.setItem('teacherToken', res.data.token);
      localStorage.setItem('teacher', JSON.stringify(res.data.teacher));
      navigate('/teacher');
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-green-50">
      <form className="bg-white p-8 rounded shadow-md w-80" onSubmit={handleLogin}>
        <h2 className="text-xl font-bold mb-4 text-center text-green-700">👩‍🏫 Teacher Login</h2>
        <input className="w-full mb-2 p-2 border" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full mb-2 p-2 border" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="w-full bg-green-600 text-white p-2 rounded mt-2" type="submit">Login</button>
      </form>
    </div>
  );
} 