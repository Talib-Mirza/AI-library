import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialEmail = params.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    if (cooldown > 0) {
      timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => { if (timer) window.clearTimeout(timer); };
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) return;
    try {
      setSending(true);
      await api.post('/auth/resend-verification-public', { email });
      setCooldown(60);
    } catch (e) {
      setCooldown(60);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-gray-800 p-6">
      <div className="w-full max-w-lg bg-white/10 dark:bg-gray-800/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 p-8 text-center">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl mb-6">
          <span className="text-white text-2xl font-bold">✉️</span>
        </div>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-purple-100 mb-3">Verify your email</h1>
        <p className="text-gray-300 mb-6">We sent a verification link to <span className="font-semibold">{email || 'your email'}</span>. Click the link in your inbox to activate your Thesyx account.</p>
        <div className="flex items-center gap-2 justify-center mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-72 px-4 py-3 bg-white/5 dark:bg-gray-800/30 border-2 border-white/20 dark:border-gray-600/30 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-300"
          />
          <button
            onClick={handleResend}
            disabled={sending || cooldown > 0 || !email}
            className="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : (sending ? 'Sending…' : 'Resend Email')}
          </button>
        </div>
        <button onClick={() => navigate('/login')} className="text-blue-300 hover:text-blue-200">Back to login</button>
      </div>
    </div>
  );
};

export default VerifyEmailPage; 