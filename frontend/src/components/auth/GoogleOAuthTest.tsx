import React from 'react';
import { motion } from 'framer-motion';
import GoogleOAuthButton from './GoogleOAuthButton';
import { toast } from 'react-hot-toast';

/**
 * Test component for Google OAuth functionality
 * Use this component during development to test Google OAuth integration
 */
const GoogleOAuthTest: React.FC = () => {
  const handleSuccess = () => {
    toast.success('🎉 Google OAuth Test Successful!');
    console.log('✅ Google OAuth working correctly');
  };

  const handleError = (error: string) => {
    toast.error(`❌ Google OAuth Test Failed: ${error}`);
    console.error('❌ Google OAuth error:', error);
  };

  return (
    <motion.div
      className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Google OAuth Test
        </h2>
        <p className="text-gray-600 text-sm">
          Test the Google OAuth integration
        </p>
      </div>

      <GoogleOAuthButton
        onSuccess={handleSuccess}
        onError={handleError}
        className="mb-4"
      />

      <div className="text-center">
        <p className="text-xs text-gray-500">
          Check the console and toast notifications for results
        </p>
      </div>
    </motion.div>
  );
};

export default GoogleOAuthTest; 