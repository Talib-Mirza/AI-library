import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axios from '../utils/axiosConfig';
import api from '../utils/axiosConfig';
import BillingService from '../services/BillingService';
import { calculatePasswordStrength } from '../utils/passwordStrength';

// Remove total_books from UserStats
type UserStats = {
  total_files_uploaded: number;
  total_tts_minutes: number;
  total_ai_queries: number;
  monthly_tts_minutes_used: number;
  monthly_ai_queries_used: number;
  monthly_book_uploads_used: number;
  last_upload_date?: string;
  last_tts_usage?: string;
};

// Remove email from ProfileFormData
interface ProfileFormData {
  full_name: string;
  bio: string;
  location: string;
  website: string;
}

const UserProfilePage: React.FC = () => {
  const { user, logout, updateProfile, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    bio: '',
    location: '',
    website: ''
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [plan, setPlan] = useState<{ tier?: string; status?: string; renewal_at?: string } | null>(null);

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [passwordStrength, setPasswordStrength] = useState<{score:number; label:string; color:string}>({score:0, label:'', color:'bg-red-500'});

  // Load user data and stats
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const statsResponse = await axios.get('/auth/stats');
        setStats(statsResponse.data);
        // Load plan (also ensures renewal is populated server-side for existing pro users)
        try {
          const planRes = await api.get('/billing/plan');
          setPlan({ tier: planRes.data?.tier, status: planRes.data?.status });
        } catch {}
        if (user) {
          setFormData({
            full_name: user.full_name || '',
            bio: user.bio || '',
            location: user.location || '',
            website: user.website || ''
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };
    if (user) loadUserData();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (name === 'new_password') {
      const s = calculatePasswordStrength(value);
      setPasswordStrength({score: s.score, label: s.label, color: s.color});
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const changedFields: Partial<ProfileFormData> = {};
      if (formData.full_name !== user?.full_name) changedFields.full_name = formData.full_name;
      if (formData.bio !== user?.bio) changedFields.bio = formData.bio;
      if (formData.location !== user?.location) changedFields.location = formData.location;
      if (formData.website !== user?.website) changedFields.website = formData.website;
      if (Object.keys(changedFields).length === 0) {
        toast('No changes made');
        return;
      }
      await updateProfile(changedFields);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await axios.delete('/auth/account');
      // Best-effort: revoke Google app access if GSI is available
      try {
        // @ts-ignore
        const gsi = window?.google?.accounts?.id;
        if (gsi && user?.email) {
          // @ts-ignore
          window.google.accounts.id.revoke(user.email, () => {
            console.log('[Google] App access revoked for', user.email);
          });
        }
      } catch (e) {
        console.warn('[Google] Revoke failed or unavailable', e);
      }
      toast.success('Account deleted successfully');
      logout();
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete account');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  // Renewal date display removed; direct users to the Billing page.

  // Adjust helpers
  const adjustTotal = async (feature: 'tts_minutes'|'ai_queries'|'book_uploads', delta: number) => {
    try {
      const res = await api.post('/auth/usage/adjust-scope', { feature, delta, scope: 'total' });
      setStats(res.data?.stats || (await api.get('/auth/stats')).data);
    } catch (e) {
      console.error('Adjust total failed', e);
    }
  };
  const adjustMonthly = async (feature: 'tts_minutes'|'ai_queries'|'book_uploads', delta: number) => {
    try {
      const res = await api.post('/auth/usage/adjust-scope', { feature, delta, scope: 'monthly' });
      setStats(res.data?.stats || (await api.get('/auth/stats')).data);
    } catch (e) {
      console.error('Adjust monthly failed', e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
                <div className="flex items-center space-x-6 mb-8">
                  <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Profile Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your account settings and preferences
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
                {/* Profile Form */}
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      <div className="flex items-center">
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                          placeholder="Enter your full name"
                          readOnly={!isEditingName}
                        />
                        <button
                          type="button"
                          className="ml-2 text-gray-400 hover:text-blue-500 focus:outline-none"
                          onClick={() => setIsEditingName((v) => !v)}
                          aria-label={isEditingName ? 'Lock name' : 'Edit name'}
                        >
                          {isEditingName ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m2-2l-6 6" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                        placeholder="Where are you located?"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        name="website"
                        value={formData.website}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                        placeholder="https://your-website.com"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving...
                        </div>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                    
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              {/* Account Info */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Account Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Member since</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {formatDate(user?.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-white font-medium break-all">
                      {user?.email || ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Plan</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {(plan?.tier || user?.subscription_tier || 'free').toUpperCase()} ({plan?.status || user?.subscription_status || 'n/a'})
                    </p>
                    <div className="mt-2">
                      <button
                        onClick={async () => {
                          try {
                            const url = await BillingService.createPortalSession();
                            window.open(url, '_blank', 'noopener');
                          } catch {
                            try {
                              const fallback = await BillingService.getPortalLink();
                              window.open(fallback, '_blank', 'noopener');
                            } catch {}
                          }
                        }}
                        className="px-3 py-1.5 text-sm rounded border dark:border-gray-700"
                      >
                        Manage Billing
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Plan renewal date</p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      See Billing page
                    </p>
                  </div>
                </div>
              </div>

              {/* Usage Statistics */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Usage Statistics
                </h3>
                <div className="space-y-5">
                  {/* Totals */}
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Files Uploaded (Total)</span>
                      <span className="text-2xl font-bold text-blue-600">{stats?.total_files_uploaded ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-gray-600 dark:text-gray-400">TTS Minutes (Total)</span>
                      <span className="text-2xl font-bold text-purple-600">{stats?.total_tts_minutes ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-gray-600 dark:text-gray-400">AI Chat Queries (Total)</span>
                      <span className="text-2xl font-bold text-emerald-600">{stats?.total_ai_queries ?? 0}</span>
                    </div>
                  </div>

                  {/* Monthly */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Book Uploads (This Month)</span>
                      <span className="text-xl font-bold text-blue-500">{stats?.monthly_book_uploads_used ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-gray-600 dark:text-gray-400">TTS Minutes (This Month)</span>
                      <span className="text-xl font-bold text-purple-500">{stats?.monthly_tts_minutes_used ?? 0}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-gray-600 dark:text-gray-400">AI Queries (This Month)</span>
                      <span className="text-xl font-bold text-emerald-500">{stats?.monthly_ai_queries_used ?? 0}</span>
                    </div>
                  </div>

                  {/* Adjust controls */}
                  {isAuthenticated && user?.is_admin && (
                    <div className="mt-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Adjust Totals (Testing)</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">TTS Minutes (Total)</span>
                          <div className="space-x-2">
                            <button onClick={() => adjustTotal('tts_minutes', -1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">-1</button>
                            <button onClick={() => adjustTotal('tts_minutes', 1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">+1</button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">AI Queries (Total)</span>
                          <div className="space-x-2">
                            <button onClick={() => adjustTotal('ai_queries', -1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">-1</button>
                            <button onClick={() => adjustTotal('ai_queries', 1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">+1</button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Book Uploads (Total)</span>
                          <div className="space-x-2">
                            <button onClick={() => adjustTotal('book_uploads', -1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">-1</button>
                            <button onClick={() => adjustTotal('book_uploads', 1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">+1</button>
                          </div>
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 pt-3">Adjust Monthly (Testing)</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">TTS Minutes (Month)</span>
                          <div className="space-x-2">
                            <button onClick={() => adjustMonthly('tts_minutes', -1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">-1</button>
                            <button onClick={() => adjustMonthly('tts_minutes', 1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">+1</button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">AI Queries (Month)</span>
                          <div className="space-x-2">
                            <button onClick={() => adjustMonthly('ai_queries', -1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">-1</button>
                            <button onClick={() => adjustMonthly('ai_queries', 1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">+1</button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Book Uploads (Month)</span>
                          <div className="space-x-2">
                            <button onClick={() => adjustMonthly('book_uploads', -1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">-1</button>
                            <button onClick={() => adjustMonthly('book_uploads', 1)} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700">+1</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-red-200 dark:border-red-800">
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
                  Danger Zone
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowPasswordModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Change Password
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="current_password"
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="mt-2">
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div className={`h-2 rounded-full ${passwordStrength.color}`} style={{ width: `${(passwordStrength.score/5)*100}%` }} />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{passwordStrength.label}</div>
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                                  <button
                    onClick={async () => {
                      if (passwordData.new_password !== passwordData.confirm_password) { toast.error('New passwords do not match'); return; }
                      if (passwordData.new_password.length < 8) { toast.error('Password must be at least 8 characters long'); return; }
                      try {
                        await axios.post('/auth/change-password', { current_password: passwordData.current_password, new_password: passwordData.new_password });
                        toast.success('Password changed successfully!');
                        setShowPasswordModal(false);
                        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                      } catch (error: any) {
                        console.error('Error changing password:', error);
                        toast.error(error.response?.data?.detail || 'Failed to change password');
                      }
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Change Password
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Delete Account
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete your account? This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfilePage;