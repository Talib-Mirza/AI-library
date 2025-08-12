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
        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
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

const UseCasesCompact: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      {/* Top bar */}
      <div className="container mx-auto px-6 pt-24 pb-6 flex items-center justify-between">
        <Link to="/" className="text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600">← Home</Link>
        <Link to="/register" className="px-4 py-2 text-sm rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">Get Started</Link>
      </div>

      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto px-6">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          Unlock the Power of Your eLibrary
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.4 }} className="mt-3 text-gray-600 dark:text-gray-300">
          Discover how our AI-powered eLibrary transforms the way you read, research, and learn.
        </motion.p>
      </div>

      {/* Compact cards */}
      <div className="max-w-6xl mx-auto px-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 mb-20">
        {useCases.map((uc, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="relative rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/60 backdrop-blur-sm p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                {uc.icon}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{uc.title}</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{uc.description}</p>
            <ul className="mt-4 space-y-1.5">
              {uc.features.map((f, idx) => (
                <li key={idx} className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                  <svg className="h-4 w-4 text-emerald-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center pb-16">
        <Link to="/register" className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700">
          Get Started
        </Link>
      </div>
    </div>
  );
};

export default UseCasesCompact; 