import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BillingService from '../services/BillingService';

interface Props {
  open: boolean;
  onClose: () => void;
  reason?: string;
}

const UpgradeModal: React.FC<Props> = ({ open, onClose, reason }) => {
  const onUpgrade = async () => {
    const url = await BillingService.createCheckoutSession();
    window.location.href = url;
  };
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Upgrade to Pro</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{reason || 'You have reached your free plan limit. Unlock higher limits with Pro (9.99/mo).'}
          </p>
          <div className="flex space-x-3">
            <button onClick={onClose} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg py-2">Cancel</button>
            <button onClick={onUpgrade} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg py-2">Upgrade Now</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpgradeModal; 