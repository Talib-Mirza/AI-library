import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 12
    }
  }
};

const UseCasesPage = () => {
  const navigate = useNavigate();

  // Use case data structure
  const useCases = [
    {
      title: "AI-Powered Reading Companion",
      description: "Highlight text in your books and get AI-generated insights, explanations, and analysis.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
      ),
      features: [
        "Get instant explanations for difficult passages",
        "Analyze literary themes and symbolism",
        "Understand complex concepts and terminology",
        "Receive contextual information about historical references"
      ]
    },
    {
      title: "Research Assistant",
      description: "Extract insights and connections across your entire library for research purposes.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
      ),
      features: [
        "Conduct semantic search across your entire library",
        "Find connections between different books and documents",
        "Generate summaries of relevant information",
        "Compile research notes with AI assistance"
      ]
    },
    {
      title: "Language Learning Support",
      description: "Use the AI assistant to understand foreign language texts and improve language skills.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.20l-.86 2.58A1 1 0 018 9h3a1 1 0 110 2H8l1.34 4.02a1 1 0 01-.96 1.32h-.01a1 1 0 01-.95-.68L6.09 11H3a1 1 0 110-2h2.45l-1.41-4.22A1 1 0 015 4h3V3a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      ),
      features: [
        "Get translations of difficult passages",
        "Explain idioms and cultural references",
        "Learn proper pronunciation and usage",
        "Practice language comprehension with AI guidance"
      ]
    },
    {
      title: "Study & Test Preparation",
      description: "Use your book collection to prepare for exams with AI-assisted learning techniques.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
        </svg>
      ),
      features: [
        "Generate practice questions from your study material",
        "Create flashcards based on important concepts",
        "Get explanations for complex topics",
        "Track progress and focus on weak areas"
      ]
    },
    {
      title: "Book Club Facilitator",
      description: "Enhance book club discussions with AI-generated talking points and literary analysis.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
        </svg>
      ),
      features: [
        "Generate discussion questions for book club meetings",
        "Provide character analysis and plot summaries",
        "Identify themes and literary devices",
        "Compare with other works by the same author"
      ]
    },
    {
      title: "Professional Development",
      description: "Use your technical books and manuals for continuous learning with AI assistance.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
      ),
      features: [
        "Get explanations for complex technical concepts",
        "Extract practical code examples and workflows",
        "Translate theoretical knowledge to practical applications",
        "Keep up with industry developments through your reference library"
      ]
    }
  ];

  return (
    <div className="min-h-screen py-12">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-blue-500">
          Unlock the Power of Your eLibrary
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Discover how our AI-powered eLibrary transforms the way you read, research, and learn.
        </p>
      </motion.div>

      {/* Features Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-12 pb-12"
      >
        {useCases.map((useCase, index) => (
          <motion.div 
            key={index}
            variants={itemVariants}
            className={`flex flex-col md:flex-row items-center bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
          >
            {/* Left Side - Image/Illustration */}
            <div className={`w-full md:w-2/5 p-8 md:p-12 ${index % 2 === 0 ? 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20' : 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20'}`}>
              <div className="h-full flex items-center justify-center">
                <div className={`w-24 h-24 flex items-center justify-center rounded-full ${index % 2 === 0 ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'}`}>
                  {useCase.icon}
                </div>
              </div>
            </div>
            
            {/* Right Side - Content */}
            <div className="w-full md:w-3/5 p-8 md:p-12">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{useCase.title}</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{useCase.description}</p>
              
              <ul className="space-y-3 mb-8">
                {useCase.features.map((feature, idx) => (
                  <motion.li 
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + (idx * 0.1) }}
                    className="flex items-start"
                  >
                    <svg className="h-5 w-5 text-green-500 mt-1 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Call to Action */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.7 }}
        className="text-center mt-12 bg-gradient-to-r from-primary-600 to-blue-600 dark:from-primary-700 dark:to-blue-700 py-16 px-4 sm:px-6 lg:px-8 rounded-xl max-w-7xl mx-auto"
      >
        <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Reading Experience?</h2>
        <p className="text-lg text-white opacity-90 mb-8 max-w-3xl mx-auto">
          Join thousands of readers who are enhancing their knowledge with our AI-powered eLibrary platform.
        </p>
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={() => navigate('/register')}
            className="px-8 py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started Now
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
          >
            Explore Library
          </button>
        </div>
      </motion.div>

      {/* Testimonials */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.7 }}
        className="max-w-5xl mx-auto mt-24 px-4 sm:px-6 lg:px-8"
      >
        <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
          >
            <div className="mb-4">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="inline-block w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">"As a PhD student, this platform has revolutionized my research process. The AI assistant helps me find connections between texts that I would have missed otherwise."</p>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold">SR</div>
              <div className="ml-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">Sarah R.</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Doctoral Researcher</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.5 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
          >
            <div className="mb-4">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="inline-block w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-4">"I run a monthly book club, and the AI features help me prepare discussion questions and insights that make our meetings so much more engaging and thought-provoking."</p>
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold">MT</div>
              <div className="ml-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">Michael T.</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Book Club Organizer</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default UseCasesPage; 
