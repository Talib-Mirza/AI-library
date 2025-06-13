import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import BookDetailsPage from './pages/BookDetailsPage'
import UseCasesPage from './pages/UseCasesPage'
import NotFoundPage from './pages/NotFoundPage'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { ensureDemoToken } from './utils/auth'

// Create a client
const queryClient = new QueryClient()

function App() {
  // Set a demo token in development mode
  useEffect(() => {
    if (import.meta.env.DEV) {
      ensureDemoToken()
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<div className="container mx-auto px-4 pt-28 pb-8"><LoginPage /></div>} />
                  <Route path="/register" element={<div className="container mx-auto px-4 pt-28 pb-8"><RegisterPage /></div>} />
                  <Route path="/use-cases" element={<div className="container mx-auto px-4 pt-28 pb-8"><UseCasesPage /></div>} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <div className="container mx-auto px-4 pt-28 pb-8">
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      </div>
                    } 
                  />
                  <Route 
                    path="/books/:bookId" 
                    element={
                      <div className="container mx-auto px-4 pt-28 pb-8">
                        <ProtectedRoute>
                          <BookDetailsPage />
                        </ProtectedRoute>
                      </div>
                    } 
                  />
                  <Route path="*" element={<div className="container mx-auto px-4 pt-28 pb-8"><NotFoundPage /></div>} />
                </Routes>
              </main>
              <Footer />
            </div>
            <Toaster position="bottom-right" />
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App
