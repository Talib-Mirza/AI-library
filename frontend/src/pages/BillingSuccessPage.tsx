import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';

const BillingSuccessPage: React.FC = () => {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [message, setMessage] = useState('Finalizing your subscription...');
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) {
      navigate('/', { replace: true });
      return;
    }
    const finalize = async () => {
      try {
        // Best-effort: trigger backend to ensure subscription metadata (renewal) is populated
        await api.get('/billing/plan');
        setMessage('Your subscription is active. Welcome to Pro!');
      } catch {
        setMessage('Subscription succeeded. You can now use Pro features.');
      }
    };
    finalize();
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-gray-900 to-gray-800 p-6">
      <div className="w-full max-w-xl bg-white/10 dark:bg-gray-800/20 rounded-2xl shadow p-8 text-center border border-white/10">
        <div className="mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
          <svg className="h-6 w-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2 text-white">Payment Successful</h1>
        <p className="text-gray-200 mb-6">{message}</p>
        <div className="space-x-2">
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded bg-blue-600 text-white">Go to Dashboard</button>
          <Link to="/profile" className="px-4 py-2 rounded border border-white/20 text-white">View Profile</Link>
        </div>
      </div>
    </div>
  );
};

export default BillingSuccessPage; 