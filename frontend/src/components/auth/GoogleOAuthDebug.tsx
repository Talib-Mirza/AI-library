import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'

const __rawApi = (import.meta as any)?.env?.VITE_API_URL
const API_BASE = typeof __rawApi === 'string' ? __rawApi.replace(/\/$/, '') : ''

const GoogleOAuthDebug: React.FC = () => {
  const { googleLogin } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    // Check environment and configuration
    const checkConfiguration = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      const hasReactOAuth = !!(window as any).google
      const hasGSI = !!(window as any).google?.accounts
      
      const info = {
        clientId: clientId ? `${clientId.substring(0, 20)}...` : 'NOT SET',
        clientIdExists: !!clientId,
        reactOAuthLoaded: hasReactOAuth,
        gsiLoaded: hasGSI,
        origin: window.location.origin,
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        cookies: document.cookie ? 'Present' : 'None',
        localStorage: Object.keys(localStorage).length,
        sessionStorage: Object.keys(sessionStorage).length
      }
      
      setDebugInfo(info)
      
      if (clientId) {
        addResult('✅ Google Client ID is configured')
      } else {
        addResult('❌ Google Client ID is missing')
      }
      
      if (hasGSI) {
        addResult('✅ Google Identity Services loaded')
      } else {
        addResult('⏳ Google Identity Services not yet loaded')
      }
    }

    checkConfiguration()
    
    // Recheck GSI loading every second for 10 seconds
    const interval = setInterval(() => {
      if ((window as any).google?.accounts) {
        addResult('✅ Google Identity Services now available')
        clearInterval(interval)
      }
    }, 1000)
    
    setTimeout(() => clearInterval(interval), 10000)
  }, [])

  const testGoogleConnection = async () => {
    addResult('🧪 Testing Google OAuth connection...')
    
    try {
      // Test 1: Check if GSI is available
      if (!(window as any).google?.accounts) {
        throw new Error('Google Identity Services not loaded')
      }
      addResult('✅ Test 1: Google Identity Services available')
      
      // Test 2: Check client ID
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId) {
        throw new Error('Client ID not configured')
      }
      addResult('✅ Test 2: Client ID configured')
      
      // Test 3: Test basic GSI functionality
      try {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: () => {
            addResult('✅ Test 3: GSI initialization successful')
          }
        })
        addResult('✅ Test 3: GSI initialize method works')
      } catch (error) {
        addResult(`❌ Test 3: GSI initialize failed: ${error}`)
      }
      
      addResult('🎉 All basic tests passed!')
      
    } catch (error) {
      addResult(`❌ Test failed: ${error}`)
    }
  }

  const testBackendConnection = async () => {
    addResult('🔗 Testing backend connection...')
    
    try {
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: 'test_token_for_connection_check'
        })
      })
      
      if (response.status === 422) {
        addResult('✅ Backend endpoint reachable (validation error expected)')
      } else {
        addResult(`📡 Backend response: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      addResult(`❌ Backend connection failed: ${error}`)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🔍 Google OAuth Debug Panel
        </h1>
        
        {/* Configuration Info */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">📋 Configuration Status</h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div><strong>Client ID:</strong> {debugInfo.clientId}</div>
              <div><strong>Client ID Valid:</strong> {debugInfo.clientIdExists ? '✅ Yes' : '❌ No'}</div>
              <div><strong>Origin:</strong> {debugInfo.origin}</div>
              <div><strong>GSI Loaded:</strong> {debugInfo.gsiLoaded ? '✅ Yes' : '❌ No'}</div>
              <div><strong>LocalStorage Keys:</strong> {debugInfo.localStorage}</div>
              <div><strong>Cookies:</strong> {debugInfo.cookies}</div>
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">🧪 Test Functions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={testGoogleConnection}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Test Google Connection
            </button>
            <button
              onClick={testBackendConnection}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Test Backend
            </button>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Clear Results
            </button>
          </div>
        </div>

        {/* Test Results */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">📊 Test Results</h2>
          <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-gray-500">No tests run yet. Click a test button above.</div>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="mb-1">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Fixes */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">🛠️ Quick Fixes</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Make sure <code>VITE_GOOGLE_CLIENT_ID</code> is set in <code>frontend/.env</code></li>
            <li>• Check that your Google Cloud Console has the correct redirect URIs</li>
            <li>• Verify that Google Identity Services API is enabled in GCP</li>
            <li>• Ensure authorized origins include <code>http://localhost:5173</code></li>
            <li>• Check browser console for additional error messages</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default GoogleOAuthDebug 