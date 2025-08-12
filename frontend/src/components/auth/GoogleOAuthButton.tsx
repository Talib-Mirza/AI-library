import React, { useState, useEffect } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../context/AuthContext'

interface GoogleOAuthButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

const GoogleOAuthButton: React.FC<GoogleOAuthButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
  className = ''
}) => {
  const { googleLogin } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [gsiLoaded, setGsiLoaded] = useState(false)

  useEffect(() => {
    const checkGSI = () => {
      if (window.google && window.google.accounts) {
        setGsiLoaded(true)
      } else {
        setTimeout(checkGSI, 100)
      }
    }
    checkGSI()
  }, [])

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      onError?.('No credential received from Google')
      return
    }

    setIsLoading(true)
    try {
      await googleLogin(credentialResponse.credential)
      onSuccess?.()
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Google OAuth login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleError = () => {
    onError?.('Google OAuth authentication failed')
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center z-10">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      )}

      <div className={`${(disabled || isLoading || !gsiLoaded) ? 'opacity-50 pointer-events-none' : ''}`}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          useOneTap={false}
          theme="outline"
          size="large"
          text="continue_with"
          shape="rectangular"
          logo_alignment="left"
          width="100%"
        />
      </div>
    </div>
  )
}

export default GoogleOAuthButton

declare global {
  interface Window {
    google?: {
      accounts: {
        id: any
        oauth2: any
      }
    }
  }
} 