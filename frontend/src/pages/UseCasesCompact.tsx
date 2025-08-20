import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const useCases = [
  {
    title: 'AI-Powered Reading Companion',
    description: 'Highlight text in your books and get AI-generated insights, explanations, and analysis.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
    features: [
      'Get instant explanations for difficult passages',
      'Analyze literary themes and symbolism',
      'Understand complex concepts and terminology',
      'Receive contextual information about historical references'
    ]
  },
  {
    title: 'Research Assistant',
    description: 'Extract insights and connections across your entire library for research purposes.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
      </svg>
    ),
    features: [
      'Conduct semantic search across your entire library',
      'Find connections between different books and documents',
      'Generate summaries of relevant information',
      'Compile research notes with AI assistance'
    ]
  },
  {
    title: 'Language Learning Support',
    description: 'Use the AI assistant to understand foreign language texts and improve language skills.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.20l-.86 2.58A1 1 0 018 9h3a1 1 0 110 2H8l1.34 4.02a1 1 0 01-.96 1.32h-.01a1 1 0 01-.95-.68L6.09 11H3a1 1 0 110-2h2.45l-1.41-4.22A1 1 0 015 4h3V3a1 1 0 011-1z" clipRule="evenodd" />
      </svg>
    ),
    features: [
      'Get translations of difficult passages',
      'Explain idioms and cultural references',
      'Learn proper pronunciation and usage',
      'Practice language comprehension with AI guidance'
    ]
  },
  {
    title: 'Study & Test Preparation',
    description: 'Use your book collection to prepare for exams with AI-assisted learning techniques.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01-.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
      </svg>
    ),
    features: [
      'Generate practice questions from your study material',
      'Create flashcards based on important concepts',
      'Get explanations for complex topics',
      'Track progress and focus on weak areas'
    ]
  },
  {
    title: 'Book Club Facilitator',
    description: 'Enhance book club discussions with AI-generated talking points and literary analysis.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
        <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
      </svg>
    ),
    features: [
      'Generate discussion questions for book club meetings',
      'Provide character analysis and plot summaries',
      'Identify themes and literary devices',
      'Compare with other works by the same author'
    ]
  },
  {
    title: 'Professional Development',
    description: 'Use your technical books and manuals for continuous learning with AI assistance.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
      </svg>
    ),
    features: [
      'Get explanations for complex technical concepts',
      'Extract practical code examples and workflows',
      'Translate theoretical knowledge to practical applications',
      'Keep up with industry developments through your reference library'
    ]
  }
];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 }
};

const UseCasesCompact: React.FC = () => {
  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-[#0b1020]">
      {/* Background beams */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(900px_600px_at_10%_-10%,rgba(99,102,241,0.35),transparent),radial-gradient(800px_500px_at_90%_0%,rgba(168,85,247,0.25),transparent),radial-gradient(1000px_600px_at_50%_120%,rgba(16,185,129,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0.5px,transparent_1.5px),linear-gradient(to_bottom,transparent_0.5px,transparent_1.5px)] bg-[length:24px_24px] opacity-[0.06]" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center">
        {/* Top bar */}
        <div className="w-full px-6 pt-24 pb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-gray-300 hover:text-white/90">← Home</Link>
          <Link to="/register" className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/20">Get Started</Link>
        </div>

        {/* Hero */}
        <div className="w-full px-6 text-center">
          <motion.h1 {...fadeUp} transition={{ duration: 0.5 }} className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-300 to-emerald-300">
            Unlock the Power of Your eLibrary
          </motion.h1>
          <motion.p {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="mt-3 text-gray-300">
            Discover how our AI-powered eLibrary transforms the way you read, research, and learn.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} className="mx-auto mt-8 h-[1px] w-32 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </div>

        {/* Cards Grid */}
        <div className="w-full px-6 md:px-10 lg:px-16 py-12 md:py-16">
          <div className="mx-auto w-full max-w-[1600px] grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
            {useCases.map((uc, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14, scale: 0.995 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
                transition={{ duration: 0.45, delay: i * 0.03 }}
                className="group relative rounded-2xl border border-white/10 bg-white/5 dark:bg-white/[0.035] p-6 backdrop-blur-xl shadow-[0_15px_35px_rgba(0,0,0,0.25)] hover:shadow-[0_25px_55px_rgba(0,0,0,0.35)] transition-all"
              >
                {/* Accents */}
                <div className="absolute -inset-px rounded-2xl bg-[linear-gradient(145deg,transparent,rgba(255,255,255,0.07),transparent)] opacity-0 group-hover:opacity-100 transition" />
                <div className="absolute top-0 left-0 h-px w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transition" />

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-200 flex items-center justify-center">
                      {uc.icon}
                    </div>
                    <h3 className="font-semibold text-white text-lg md:text-xl">{uc.title}</h3>
                  </div>
                  <p className="mt-3 text-sm text-gray-300/95">{uc.description}</p>
                  <ul className="mt-4 space-y-2">
                    {uc.features.map((f, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-200/95">
                        <svg className="h-4 w-4 text-emerald-400 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="w-full text-center pb-16 pt-2">
          <Link to="/register" className="inline-flex items-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-600/20">
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UseCasesCompact; 