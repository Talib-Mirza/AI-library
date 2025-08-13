import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import BillingService from '../services/BillingService';

gsap.registerPlugin(ScrollTrigger);

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  useEffect(() => {
    if (navRef.current) {
      gsap.to(navRef.current, {
        y: isVisible ? 0 : -100,
        duration: 0.4,
        ease: "power2.out"
      });
    }
  }, [isVisible]);

  const isActive = (path: string) => location.pathname === path;

  const [showUserMenu, setShowUserMenu] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  return (
    <header 
      ref={navRef}
      className="fixed w-full top-0 z-50 transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-white/20 dark:border-gray-700/20"
    >
      <div className="container mx-auto px-6 py-1">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 group"
            aria-label="Thesyx Home"
          >
            <img
              src="/images/Thesyx-Logo.png"
              alt="Thesyx"
              className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`relative px-4 py-2 font-medium transition-all duration-300 group ${
                isActive('/') 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400'
              }`}
            >
              <span className="relative z-10">Home</span>
              <div className={`absolute inset-0 rounded-lg bg-blue-50 dark:bg-blue-900/20 transform transition-transform duration-300 ${
                isActive('/') ? 'scale-100' : 'scale-0 group-hover:scale-100'
              }`}></div>
              {isActive('/') && (
                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></span>
              )}
            </Link>

            <Link 
              to="/pricing" 
              className={`relative px-4 py-2 font-medium transition-all duration-300 group ${
                isActive('/pricing') 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400'
              }`}
            >
              <span className="relative z-10">Pricing</span>
              <div className={`absolute inset-0 rounded-lg bg-blue-50 dark:bg-blue-900/20 transform transition-transform duration-300 ${
                isActive('/pricing') ? 'scale-100' : 'scale-0 group-hover:scale-100'
              }`}></div>
              {isActive('/pricing') && (
                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></span>
              )}
            </Link>

            {isAuthenticated && user?.is_admin && (
              <Link 
                to="/admin" 
                className={`relative px-4 py-2 font-medium transition-all duration-300 group ${
                  isActive('/admin') 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400'
                }`}
              >
                <span className="relative z-10">Admin</span>
                <div className={`absolute inset-0 rounded-lg bg-blue-50 dark:bg-blue-900/20 transform transition-transform duration-300 ${
                  isActive('/admin') ? 'scale-100' : 'scale-0 group-hover:scale-100'
                }`}></div>
                {isActive('/admin') && (
                  <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></span>
                )}
              </Link>
            )}
            
            {isAuthenticated ? (
              <>
                <Link 
                  to="/dashboard" 
                  className={`relative px-4 py-2 font-medium transition-all duration-300 group ${
                    isActive('/dashboard') 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400'
                  }`}
                >
                  <span className="relative z-10">Dashboard</span>
                  <div className={`absolute inset-0 rounded-lg bg-blue-50 dark:bg-blue-900/20 transform transition-transform duration-300 ${
                    isActive('/dashboard') ? 'scale-100' : 'scale-0 group-hover:scale-100'
                  }`}></div>
                  {isActive('/dashboard') && (
                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></span>
                  )}
                </Link>

                {/* Avatar dropdown */}
                <div ref={avatarRef} className="relative">
                  <button onClick={() => setShowUserMenu(s => !s)} className="relative group" aria-label="User menu">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium shadow-lg transform transition-transform hover:scale-110 duration-300">
                      <span className="text-white text-lg font-bold">TX</span>
                    </div>
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                      <Link to="/profile" className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setShowUserMenu(false)}>
                        Profile
                      </Link>
                      <button className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={async () => {
                        try {
                          const url = await BillingService.createPortalSession();
                          window.open(url, '_blank', 'noopener');
                        } catch (e) {
                          console.error('Portal session error', e);
                          try {
                            const fallback = await BillingService.getPortalLink();
                            window.open(fallback, '_blank', 'noopener');
                          } catch (e2) {
                            console.error('Portal fallback link error', e2);
                          }
                        } finally {
                          setShowUserMenu(false);
                        }
                      }}>
                        Manage Billing
                      </button>
                      <button className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => { handleLogout(); setShowUserMenu(false); }}>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className={`relative px-4 py-2 font-medium transition-all duration-300 group ${
                    isActive('/login') 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-700 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400'
                  }`}
                >
                  <span className="relative z-10">Login</span>
                  <div className={`absolute inset-0 rounded-lg bg-blue-50 dark:bg-blue-900/20 transform transition-transform duration-300 ${
                    isActive('/login') ? 'scale-100' : 'scale-0 group-hover:scale-100'
                  }`}></div>
                  {isActive('/login') && (
                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></span>
                  )}
                </Link>
                
                <Link 
                  to="/register" 
                  className="relative px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg group overflow-hidden"
                >
                  <span className="relative z-10">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </Link>
              </>
            )}
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="relative w-14 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center transition-all duration-300 focus:outline-none shadow-inner group"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <div
                className={`w-6 h-6 rounded-full transform transition-all duration-500 flex items-center justify-center shadow-md ${
                  theme === 'dark' 
                    ? 'translate-x-7 bg-gradient-to-br from-purple-600 to-blue-600' 
                    : 'translate-x-1 bg-gradient-to-br from-yellow-400 to-orange-500'
                }`}
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="relative w-14 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center transition-all duration-300 focus:outline-none shadow-inner"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <div
                className={`w-6 h-6 rounded-full transform transition-all duration-500 flex items-center justify-center shadow-md ${
                  theme === 'dark' 
                    ? 'translate-x-7 bg-gradient-to-br from-purple-600 to-blue-600' 
                    : 'translate-x-1 bg-gradient-to-br from-yellow-400 to-orange-500'
                }`}
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300 focus:outline-none"
            >
              {mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-3">
              <Link 
                to="/" 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
                  isActive('/') 
                    ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' 
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800'
                }`}
              >
                Home
              </Link>

              <Link 
                to="/pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
                  isActive('/pricing') 
                    ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' 
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800'
                }`}
              >
                Pricing
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link 
                    to="/dashboard" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
                      isActive('/dashboard') 
                        ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' 
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    Dashboard
                  </Link>
                  {user?.is_admin && (
                    <Link 
                      to="/admin" 
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
                        isActive('/admin') 
                          ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' 
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800'
                      }`}
                    >
                      Admin
                    </Link>
                  )}

                  <button 
                    onClick={handleLogout}
                    className="px-4 py-2 text-left rounded-lg text-gray-700 hover:text-red-600 hover:bg-red-50 dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-red-900/20 font-medium transition-colors duration-300"
                  >
                    Logout
                  </button>
                  
                  {/* Profile Circle in Mobile Menu */}
                  <div className="flex items-center space-x-3 px-4 py-2 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link 
                      to="/profile" 
                      className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium shadow-lg"
                      title="View Profile"
                    >
                      <span className="text-white text-lg font-bold">TX</span>
                    </Link>
                    <div className="flex flex-col">
                      <span className="text-sm font-normal text-gray-600 dark:text-gray-400">
                        Welcome back,
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white"></span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors duration-300 ${
                      isActive('/login') 
                        ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' 
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    Login
                  </Link>
                  
                  <Link 
                    to="/register" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-300 text-center"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
