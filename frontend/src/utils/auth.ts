// Simple authentication utilities for token management

/**
 * Store authentication token in localStorage
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem('token', token);
};

/**
 * Get the stored authentication token
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Remove the authentication token
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem('token');
};

/**
 * Check if the user is logged in (has a token)
 */
  export const isLoggedIn = (): boolean => {
    return !!getAuthToken();
  };

/**
 * For demo purposes: set a mock token if none exists
 * This should be removed in production
 */
export const ensureDemoToken = (): void => {
  if (!getAuthToken()) {
    // This is a mock token for development purposes only
    setAuthToken('demo_token_for_development');
  }
}; 