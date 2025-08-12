import React from 'react';
import { Link } from 'react-router-dom';

const BillingCancelPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 pt-28 pb-16">
      <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow p-8 text-center">
        <div className="mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2">Payment Canceled</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Your checkout was canceled. You can retry anytime.</p>
        <div className="space-x-2">
          <Link to="/pricing" className="px-4 py-2 rounded bg-blue-600 text-white">Back to Pricing</Link>
          <Link to="/dashboard" className="px-4 py-2 rounded border dark:border-gray-700">Go to Dashboard</Link>
        </div>
      </div>
    </div>
  );
};

export default BillingCancelPage; 