import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';

const BillingSuccessPage: React.FC = () => {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [message, setMessage] = useState('Finalizing your subscription...');
  const navigate = useNavigate();

  useEffect(() => {
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
  }, [sessionId]);

  return (
    <div className="container mx-auto px-4 pt-28 pb-16">
      <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow p-8 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
          <svg className="h-6 w-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2">Payment Successful</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="space-x-2">
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded bg-blue-600 text-white">Go to Dashboard</button>
          <Link to="/profile" className="px-4 py-2 rounded border dark:border-gray-700">View Profile</Link>
        </div>
        {sessionId && (
          <p className="text-xs text-gray-400 mt-4">Session: {sessionId}</p>
        )}
      </div>
    </div>
  );
};

export default BillingSuccessPage; 