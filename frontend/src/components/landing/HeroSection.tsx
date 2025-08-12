import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const HeroSection = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative min-h-[105vh] flex items-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 dark:from-black dark:via-slate-950 dark:to-black">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Soft radial glow */}
        <div className="absolute -top-24 -left-24 h-[38rem] w-[38rem] rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[34rem] w-[34rem] rounded-full bg-gradient-to-tr from-fuchsia-500/10 to-cyan-500/10 blur-3xl" />
        {/* Grid overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-24 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div>
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0, duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 dark:text-gray-200">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Experience AI chat + Text‑to‑Speech
              </div>
            </motion.div>

            <motion.h1
              className="mt-6 text-4xl md:text-6xl lg:text-7xl font-black tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.7 }}
            >
              Read Smarter. Ask Faster. Listen Effortlessly.
            </motion.h1>

            <motion.p
              className="mt-6 max-w-2xl text-lg md:text-xl text-gray-300/90 leading-relaxed"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
            >
              Thesyx transforms PDFs into interactive knowledge. Ask grounded questions about your documents and listen with intelligent, natural TTS—optimized for focus and speed.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col sm:flex-row items-center gap-4"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7 }}
            >
              <Link
                to={isAuthenticated ? '/dashboard' : '/register'}
                className="group relative inline-flex items-center justify-center rounded-xl px-6 py-3 text-white font-semibold bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg shadow-blue-700/20 transition-transform duration-200 hover:scale-[1.03]"
              >
                <span className="relative z-10">{isAuthenticated ? 'Enter Dashboard' : 'Get Started'}</span>
                <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              </Link>

              <Link
                to="/use-cases"
                className="inline-flex items-center justify-center rounded-xl px-6 py-3 border border-white/15 text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 transition-colors duration-200"
              >
                Learn More
              </Link>
            </motion.div>
          </div>

          {/* Right: Abstract visual */}
          <motion.div
            className="relative order-first lg:order-last"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8 }}
          >
            <div className="relative mx-auto h-[320px] w-[320px] md:h-[420px] md:w-[420px] lg:h-[480px] lg:w-[480px]">
              {/* Concentric glow */}
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-emerald-500/20 blur-2xl" />
              {/* Core card */}
              <div className="relative h-full w-full rounded-[2rem] bg-gradient-to-b from-slate-800/80 to-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Animated mesh lines */}
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 600 600">
                  <defs>
                    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#60A5FA" />
                      <stop offset="100%" stopColor="#A78BFA" />
                    </linearGradient>
                  </defs>
                  <g fill="none" stroke="url(#lg)" strokeWidth="1">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <path key={i} d={`M0 ${i * 34} C 150 ${i * 34 + (i % 2 ? 24 : -24)}, 450 ${i * 34 + (i % 2 ? -24 : 24)}, 600 ${i * 34}`} />
                    ))}
                  </g>
                </svg>
                {/* Floating dots */}
                <div className="absolute inset-0">
                  {Array.from({ length: 14 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="absolute h-2 w-2 rounded-full bg-gradient-to-br from-blue-400 to-purple-400"
                      style={{ top: `${Math.random() * 90 + 5}%`, left: `${Math.random() * 90 + 5}%` }}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 1.2 }}
                    />
                  ))}
                </div>
                {/* Caption */}
                <div className="absolute bottom-0 left-0 right-0 p-4 text-center text-sm text-gray-300/80 bg-gradient-to-t from-black/30 to-transparent">
                  Modern PDF + AI chat + TTS
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection; 
