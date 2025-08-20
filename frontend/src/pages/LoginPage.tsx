import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import gsap from 'gsap';
import { motion } from 'framer-motion';
import GoogleOAuthButton from '../components/auth/GoogleOAuthButton';
import api from '../utils/axiosConfig';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  // Show toast if redirected after email verification
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('verified') === '1') {
      toast.success('Email verified! You can now sign in.');
    }
  }, [location.search]);
  
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
      ease: "back.out(1.7)"
    })
    .to(formRef.current, {
      duration: 0.8,
      opacity: 1,
      y: 0,
      ease: "back.out(1.7)"
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

    gsap.fromTo(containerRef.current, 
      { opacity: 0, y: 30 },
      { 
        opacity: 1, 
        y: 0, 
        duration: 1.2, 
        ease: "easeOut" 
      }
    );
    
    gsap.fromTo(formRef.current, 
      { opacity: 0, x: -20 },
      { 
        opacity: 1, 
        x: 0, 
        duration: 0.8, 
        delay: 0.3,
        ease: "easeOut" 
      }
    );
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await login(email, password, rememberMe);
      toast.success('Successfully logged in!');
      
      // Redirect to the page they tried to visit or dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error?.message || '';
      if (message.includes('Email not verified')) {
        setUnverified(true);
        toast.error('Email not verified. Check your inbox or resend the verification email.');
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        toast.error('Failed to login. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      await api.post('/auth/resend-verification');
      toast.success('Verification email sent. Please check your inbox.');
    } catch (e) {
      toast.error('Failed to resend verification email.');
    } finally {
      setResending(false);
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
            Welcome Back
          </h1>
          <p className="text-gray-400 text-lg">Sign in to your Thesyx account</p>
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
                  placeholder="Enter your password"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </div>
            </div>
            
            {/* Remember Me & Forgot Password */}
            <div className="form-field">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-700/50 backdrop-blur-sm"
                  />
                  <label htmlFor="remember-me" className="ml-3 block text-sm text-gray-300">
                    Remember me
                  </label>
                </div>
                
                <div className="text-sm">
                  <Link 
                    to="/forgot-password" 
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200 relative group"
                  >
                    Forgot password?
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                </div>
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
                    Signing in...
                  </>
                ) : (
                  'Sign In'
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
                console.log('Google OAuth login success');
              }}
              onError={(error) => {
                console.error('Google OAuth login error:', error);
              }}
            />
          </form>
          
          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gray-800/50 text-gray-400 rounded-full backdrop-blur-sm">
                New to Thesyx?
              </span>
            </div>
          </div>
        </motion.div>
        
        {/* Register Link */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-gray-400"
        >
          Don't have an account?{' '}
          <Link 
            to="/register" 
            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-200 relative group"
          >
            Create one now
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"></span>
          </Link>
        </motion.p>
        
        {/* Additional Features */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="text-center space-y-3"
        >
          <p className="text-gray-500 text-sm">Access thousands of books with AI-powered insights</p>
          <div className="flex justify-center items-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Secure</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Fast</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Smart</span>
            </div>
          </div>
        </motion.div>

        {unverified && (
          <div className="mt-2 text-sm text-gray-300">
            Didn’t get the email?{' '}
            <button type="button" onClick={handleResend} disabled={resending} className="text-blue-400 hover:text-blue-300 font-medium">
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage; 
