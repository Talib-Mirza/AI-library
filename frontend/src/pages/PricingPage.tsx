import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BillingService from '../services/BillingService';

const PricingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (isAuthenticated) {
          const plan = await BillingService.getPlan();
          setIsPro((plan?.tier || '').toLowerCase() === 'pro');
        } else {
          setIsPro(false);
        }
      } catch {
        setIsPro(false);
      }
    };
    load();
  }, [isAuthenticated]);

  const upgrade = async () => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    const url = await BillingService.createCheckoutSession();
    window.location.href = url;
  };

  const freeButtonText = !isAuthenticated ? 'Select' : (isPro ? 'Manage Billing' : 'Current');
  const onFreeClick = async () => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    if (isPro) {
      try {
        const url = await BillingService.createPortalSession();
        window.location.href = url;
      } catch (e) {
        console.error('Portal session error', e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24">
      <div className="container mx-auto px-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-10 text-center">Choose your plan</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Free</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Get started</p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300 mb-2">
              <li>10 AI queries total</li>
              <li>10 minutes TTS total</li>
              <li>5 book uploads total</li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Lifetime totals across your account</p>
            <button onClick={onFreeClick} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg py-2">{freeButtonText}</button>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 border-2 border-blue-600">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pro</h2>
              <span className="text-2xl font-bold text-blue-600">$9.99/mo</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">For power readers</p>
            <ul className="space-y-2 text-gray-700 dark:text-gray-300 mb-2">
              <li>300 AI queries / month</li>
              <li>3 hours TTS / month</li>
              <li>20 book uploads / month</li>
            </ul>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Usage resets every month</p>
            {isPro ? (
              <button disabled className="w-full bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg py-2 cursor-not-allowed">Current</button>
            ) : (
              <button onClick={upgrade} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg py-2">Upgrade to Pro</button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage; 