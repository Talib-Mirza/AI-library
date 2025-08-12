import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import gsap from 'gsap';
import { motion } from 'framer-motion';
import GoogleOAuthButton from '../components/auth/GoogleOAuthButton';

// Password strength checker function
const calculatePasswordStrength = (password: string): { score: number; feedback: string } => {
  if (!password) return { score: 0, feedback: '' };
  
  let score = 0;
  const feedback = [];
  
  // Check length
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Use at least 8 characters');
  }
  
  // Check for numbers
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one number');
  }
  
  // Check for lowercase letters
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one lowercase letter');
  }
  
  // Check for uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one uppercase letter');
  }
  
  // Check for special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include at least one special character');
  }
  
  return { 
    score, 
    feedback: feedback.length > 0 ? feedback.join(', ') : 'Strong password!'
  };
};

const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });
  const { register } = useAuth();
  const navigate = useNavigate();

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  // Update password strength whenever password changes
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);
  
  // GSAP animations on mount
  useEffect(() => {
    const tl = gsap.timeline();
    
    // Set initial states
    gsap.set([titleRef.current, formRef.current], { opacity: 0, y: 50 });
    
    // Animate entrance
    tl.to(titleRef.current, {
      duration: 0.8,
      opacity: 1,
      y: 0,
      ease: "power2.out"
    })
    .to(formRef.current, {
      duration: 0.8,
      opacity: 1,
      y: 0,
      ease: "power2.out"
    }, "-=0.4");
    
    // Animate form fields
    const formFields = formRef.current?.querySelectorAll('.form-field');
    if (formFields) {
      gsap.fromTo(formFields, 
        { opacity: 0, x: -30 },
        { 
          opacity: 1, 
          x: 0, 
          duration: 0.6, 
          stagger: 0.1, 
          ease: "power2.out",
          delay: 0.3
        }
      );
    }
  }, []);
  
  const getStrengthColor = (score: number) => {
    if (score <= 1) return 'from-red-500 to-red-600';
    if (score <= 3) return 'from-yellow-400 to-orange-500';
    return 'from-green-400 to-emerald-500';
  };
  
  const getStrengthLabel = (score: number) => {
    if (score <= 1) return 'Weak';
    if (score <= 3) return 'Moderate';
    return 'Strong';
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    // Require at least moderate password strength
    if (passwordStrength.score < 3) {
      toast.error('Please use a stronger password');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await register(fullName, email, password);
      toast.success('Account created! Please check your email to verify your account.');
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to create account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-gray-800 dark:from-black dark:via-gray-900 dark:to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-2xl animate-spin" style={{ animationDuration: '20s' }}></div>
      </div>
      
      <div ref={containerRef} className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "backOut" }}
            className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl mb-6 relative overflow-hidden group"
          >
            <span className="text-white text-2xl font-bold z-10">AI</span>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-50"></div>
          </motion.div>
          
          <h1 ref={titleRef} className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-purple-100 mb-2">
            Join Thesyx
          </h1>
          <p className="text-gray-400 text-lg">Create your account and start exploring</p>
        </div>
        
        {/* Form Container */}
        <motion.div 
          className="bg-white/10 dark:bg-gray-800/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 p-8 relative overflow-hidden"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Glass effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
          
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Full Name Field */}
            <div className="form-field">
              <label htmlFor="fullName" className="block text-sm font-semibold text-gray-200 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative group">
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full px-4 py-4 bg-white/5 dark:bg-gray-800/30 border-2 border-white/20 dark:border-gray-600/30 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                  placeholder="Enter your full name"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </div>
            </div>
            
            {/* Email Field */}
            <div className="form-field">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-200 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-4 bg-white/5 dark:bg-gray-800/30 border-2 border-white/20 dark:border-gray-600/30 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                  placeholder="Enter your email"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </div>
            </div>
            
            {/* Password Field */}
            <div className="form-field">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-200 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative group">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-4 bg-white/5 dark:bg-gray-800/30 border-2 border-white/20 dark:border-gray-600/30 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                  placeholder="Create a strong password"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </div>
              
              {/* Password strength indicator */}
              {password && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-300">
                      Password Strength: <span className={`font-bold ${passwordStrength.score <= 1 ? 'text-red-400' : passwordStrength.score <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {getStrengthLabel(passwordStrength.score)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {passwordStrength.score}/5
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full bg-gradient-to-r ${getStrengthColor(passwordStrength.score)} rounded-full relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </motion.div>
                  </div>
                  {passwordStrength.feedback && (
                    <p className="text-xs text-gray-400 bg-black/20 rounded-lg px-3 py-2 backdrop-blur-sm">
                      {passwordStrength.feedback}
                    </p>
                  )}
                </motion.div>
              )}
            </div>
            
            {/* Confirm Password Field */}
            <div className="form-field">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-200 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative group">
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-4 bg-white/5 dark:bg-gray-800/30 border-2 border-white/20 dark:border-gray-600/30 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all duration-300 backdrop-blur-sm"
                  placeholder="Confirm your password"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2 backdrop-blur-sm"
                >
                  Passwords don't match
                </motion.p>
              )}
            </div>
            
            {/* Terms and Conditions */}
            <div className="form-field">
              <div className="flex items-center">
                <input
                  id="agree-terms"
                  name="agree-terms"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700/50 backdrop-blur-sm"
                  required
                />
                <label htmlFor="agree-terms" className="ml-3 block text-sm text-gray-300">
                  I agree to the{' '}
                  <button type="button" onClick={() => setShowTerms(true)} className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200 underline underline-offset-2">
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button type="button" onClick={() => setShowPrivacy(true)} className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200 underline underline-offset-2">
                    Privacy Policy
                  </button>
                </label>
              </div>
            </div>
            
            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-500 hover:via-purple-500 hover:to-blue-600 text-white font-semibold rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10 flex items-center justify-center">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            </motion.button>

            {/* Divider */}
            <div className="relative flex items-center justify-center py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600/30"></div>
              </div>
              <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
                <span className="text-sm text-gray-400 font-medium">OR</span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <GoogleOAuthButton 
              onSuccess={() => {
                console.log('Google OAuth success');
              }}
              onError={(error) => {
                console.error('Google OAuth error:', error);
              }}
            />
          </form>
        </motion.div>
        
        {/* Login Link */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-gray-400"
        >
          Already have an account?{' '}
          <Link 
            to="/login" 
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-200 relative group"
          >
            Sign in
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
          </Link>
        </motion.p>
      </div>

      {/* Privacy Modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy Policy</h3>
              <button onClick={() => setShowPrivacy(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <iframe title="Privacy Policy" src="/privacy" className="w-full h-[65vh] rounded-lg bg-white dark:bg-gray-900"></iframe>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <a href="/privacy" target="_blank" rel="noopener" onClick={() => setShowPrivacy(false)} className="text-blue-600 hover:text-blue-500 font-medium">Open full page</a>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Terms of Service</h3>
              <button onClick={() => setShowTerms(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <iframe title="Terms of Service" src="/terms" className="w-full h-[65vh] rounded-lg bg-white dark:bg-gray-900"></iframe>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <a href="/terms" target="_blank" rel="noopener" onClick={() => setShowTerms(false)} className="text-blue-600 hover:text-blue-500 font-medium">Open full page</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage; 
