import { useEffect, type ReactElement } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import BookDetailsPage from './pages/BookDetailsPage'
import UserProfilePage from './pages/UserProfilePage'
import UseCasesCompact from './pages/UseCasesCompact'
import NotFoundPage from './pages/NotFoundPage'
import GoogleOAuthDebug from './components/auth/GoogleOAuthDebug'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { ensureDemoToken } from './utils/auth'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PricingPage from './pages/PricingPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import AdminPage from './pages/AdminPage'
import { Navigate } from 'react-router-dom'
import BillingSuccessPage from './pages/BillingSuccessPage'
import BillingCancelPage from './pages/BillingCancelPage'
import ErrorBoundary from './components/ErrorBoundary'

// Create a client
const queryClient = new QueryClient()

// Get Google Client ID from environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const AdminRoute = ({ children }: { children: ReactElement }) => {
  const { user } = useAuth();
  if (!user?.is_admin) return <Navigate to="/" replace />;
  return children;
}

function App() {
  // Set a demo token in development mode
  useEffect(() => {
    if (import.meta.env.DEV) {
      ensureDemoToken()
    }
  }, [])

  if (!GOOGLE_CLIENT_ID) {
    console.error('Google Client ID is not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file.')
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">
                <ErrorBoundary>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/use-cases" element={<UseCasesCompact />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms" element={<TermsOfServicePage />} />
                    <Route path="/billing/success" element={<BillingSuccessPage />} />
                    <Route path="/billing/cancel" element={<BillingCancelPage />} />
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/books/:bookId" 
                      element={
                        <ProtectedRoute>
                          <BookDetailsPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/profile" 
                      element={
                        <ProtectedRoute>
                          <UserProfilePage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/admin" 
                      element={
                        <ProtectedRoute>
                          <AdminRoute>
                            <AdminPage />
                          </AdminRoute>
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </ErrorBoundary>
              </main>
              <Footer />
            </div>
            <Toaster position="bottom-right" />
          </AuthProvider>
        </ThemeProvider>
      </Router>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  )
}

export default App
