import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/login', isAdmin
        ? { email, password, isAdmin: true }
        : { student_id: studentId, password, isAdmin: false }
      );
      localStorage.setItem('token', res.data.token);
      if (isAdmin) {
        navigate('/admin');
      } else {
        localStorage.setItem('student', JSON.stringify(res.data.user)); // Store student info
        navigate('/student');
      }
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-100">
      <form className="bg-white p-8 rounded shadow-md w-80" onSubmit={handleLogin}>
        <h2 className="text-xl font-bold mb-4 text-center">🔒 Login to Access Your Result</h2>
        {isAdmin ? (
          <>
            <input className="w-full mb-2 p-2 border" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="w-full mb-2 p-2 border" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          </>
        ) : (
          <>
            <input className="w-full mb-2 p-2 border" placeholder="Student ID / Username" value={studentId} onChange={e => setStudentId(e.target.value)} />
            <input className="w-full mb-2 p-2 border" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          </>
        )}
        <button className="w-full bg-blue-500 text-white p-2 rounded mt-2" type="submit">Login</button>
        <div className="flex justify-between mt-2">
          <span className="text-sm text-blue-600 cursor-pointer" onClick={() => alert('Password reset not implemented')}>Forgot Password?</span>
          <span className="text-sm text-blue-600 cursor-pointer" onClick={() => setIsAdmin(!isAdmin)}>{isAdmin ? 'Student Login?' : 'Admin Login?'}</span>
        </div>
      </form>
    </div>
  );
} 