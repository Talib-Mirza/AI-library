import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../utils/axiosConfig';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid or missing token');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.post('/auth/reset-password', { token, new_password: password });
      toast.success('Password reset! You can now log in.');
      navigate('/login');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-gray-800 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white/10 dark:bg-gray-800/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700/30 p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
        <p className="text-gray-300 mb-4">Enter your new password below.</p>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="New password" className="w-full px-4 py-3 bg-white/5 dark:bg-gray-800/30 border-2 border-white/20 dark:border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-300 mb-3" />
        <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} placeholder="Confirm new password" className="w-full px-4 py-3 bg-white/5 dark:bg-gray-800/30 border-2 border-white/20 dark:border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-300" />
        <button type="submit" disabled={isSubmitting || !password || !confirm} className="mt-4 w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl disabled:opacity-50">{isSubmitting ? 'Resetting…' : 'Reset Password'}</button>
      </form>
    </div>
  );
};

export default ResetPasswordPage; 