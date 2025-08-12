import React, { useEffect, useState } from 'react';
import AdminService, { AdminUser } from '../services/AdminService';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const AdminPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [createForm, setCreateForm] = useState({ email: '', full_name: '', password: '', is_verified: true, subscription_tier: 'free', subscription_status: '' });
  const [editingPlanUser, setEditingPlanUser] = useState<AdminUser | null>(null);
  const [planForm, setPlanForm] = useState<{ subscription_tier: string; subscription_status: string; subscription_renewal_at: string }>({ subscription_tier: 'free', subscription_status: '', subscription_renewal_at: '' });

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await AdminService.getUsers(skip, limit);
        setUsers(res.items);
        setTotal(res.total);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [skip, limit]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.is_admin) return <Navigate to="/" replace />;

  const pages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(skip / limit) + 1;

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { email: createForm.email, full_name: createForm.full_name };
    if (createForm.password) payload.password = createForm.password;
    payload.is_verified = !!createForm.is_verified;
    if (createForm.subscription_tier) payload.subscription_tier = createForm.subscription_tier;
    if (createForm.subscription_status) payload.subscription_status = createForm.subscription_status;
    const created = await AdminService.createUser(payload);
    setUsers([created, ...users]);
    setTotal(total + 1);
    setCreateForm({ email: '', full_name: '', password: '', is_verified: true, subscription_tier: 'free', subscription_status: '' });
    alert(created.temporary_password ? `User created. Temporary password: ${created.temporary_password}` : 'User created.');
  };

  const openEditPlan = (u: AdminUser) => {
    setEditingPlanUser(u);
    setPlanForm({
      subscription_tier: (u.subscription_tier || 'free').toLowerCase(),
      subscription_status: (u.subscription_status || ''),
      subscription_renewal_at: ''
    });
  };

  const savePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanUser) return;
    const payload: any = {
      subscription_tier: planForm.subscription_tier,
      subscription_status: planForm.subscription_status
    };
    if (planForm.subscription_renewal_at) payload.subscription_renewal_at = planForm.subscription_renewal_at;
    const updated = await AdminService.updateUserPlan(editingPlanUser.id, payload);
    setUsers(users.map(u => u.id === updated.id ? updated : u));
    setEditingPlanUser(null);
  };

  const deleteUser = async (u: AdminUser) => {
    if (!window.confirm(`Delete user ${u.email}? This cannot be undone.`)) return;
    await AdminService.deleteUser(u.id);
    setUsers(users.filter(x => x.id !== u.id));
    setTotal(Math.max(0, total - 1));
  };

  return (
    <div className="container mx-auto px-4 pt-28 pb-12">
      <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-medium">Users</div>
            <div className="text-sm text-gray-500">Total: {total}</div>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm">Page size</label>
            <select
              value={limit}
              onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setSkip(0); }}
              className="border rounded px-2 py-1 text-sm dark:bg-gray-900 dark:border-gray-700"
            >
              {[10, 25, 50, 100].map(sz => <option key={sz} value={sz}>{sz}</option>)}
            </select>
          </div>
        </div>
        <div className="px-4 pb-4">
          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500">Email</label>
              <input value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} required className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500">Full name</label>
              <input value={createForm.full_name} onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })} required className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Password (optional)</label>
              <input value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Verified</label>
              <select value={createForm.is_verified ? 'yes' : 'no'} onChange={e => setCreateForm({ ...createForm, is_verified: e.target.value === 'yes' })} className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-900 dark:border-gray-700">
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Tier</label>
              <select value={createForm.subscription_tier} onChange={e => setCreateForm({ ...createForm, subscription_tier: e.target.value })} className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-900 dark:border-gray-700">
                <option value="free">free</option>
                <option value="pro">pro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500">Status</label>
              <input value={createForm.subscription_status} placeholder="active/trialing/canceled/etc" onChange={e => setCreateForm({ ...createForm, subscription_status: e.target.value })} className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-900 dark:border-gray-700" />
            </div>
            <div className="md:col-span-6">
              <button type="submit" className="mt-2 px-3 py-1.5 rounded bg-blue-600 text-white text-sm">Create test user</button>
            </div>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Totals</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Monthly</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2"></th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No users found</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{u.full_name || '(no name)'} {u.is_admin && <span className="ml-2 text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">Admin</span>}</div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{(u.subscription_tier || 'free').toUpperCase()}</div>
                      <div className="text-xs text-gray-500">{u.subscription_status || 'n/a'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>Books: {u.total_files_uploaded}</div>
                      <div>TTS: {u.total_tts_minutes} min</div>
                      <div>AI: {u.total_ai_queries}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>Books: {u.monthly_book_uploads_used}</div>
                      <div>TTS: {u.monthly_tts_minutes_used} min</div>
                      <div>AI: {u.monthly_ai_queries_used}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${u.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => openEditPlan(u)} className="px-2 py-1 text-xs rounded border dark:border-gray-700">Edit Plan</button>
                      <button onClick={() => deleteUser(u)} className="px-2 py-1 text-xs rounded border border-red-600 text-red-600 dark:border-red-400">Delete</button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500">Page {currentPage} of {pages}</div>
          <div className="space-x-2">
            <button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - limit))} className="px-3 py-1 rounded border text-sm disabled:opacity-50 dark:border-gray-700">Prev</button>
            <button disabled={skip + limit >= total} onClick={() => setSkip(skip + limit)} className="px-3 py-1 rounded border text-sm disabled:opacity-50 dark:border-gray-700">Next</button>
          </div>
        </div>
      </div>
      {editingPlanUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditingPlanUser(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-3">Edit Plan: {editingPlanUser.email}</div>
            <form onSubmit={savePlan} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500">Tier</label>
                <select value={planForm.subscription_tier} onChange={e => setPlanForm({ ...planForm, subscription_tier: e.target.value })} className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-900 dark:border-gray-700">
                  <option value="free">free</option>
                  <option value="pro">pro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500">Status</label>
                <input value={planForm.subscription_status} onChange={e => setPlanForm({ ...planForm, subscription_status: e.target.value })} placeholder="active/trialing/canceled/etc" className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-900 dark:border-gray-700" />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Renewal at (ISO, optional)</label>
                <input value={planForm.subscription_renewal_at} onChange={e => setPlanForm({ ...planForm, subscription_renewal_at: e.target.value })} placeholder="2025-01-31T00:00:00Z" className="w-full border rounded px-2 py-1 text-sm dark:bg-gray-900 dark:border-gray-700" />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setEditingPlanUser(null)} className="px-3 py-1 rounded border text-sm dark:border-gray-700">Cancel</button>
                <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="mt-6 text-sm text-gray-500">
        Note: Admin access is strictly enforced server-side. This page is visible only to admins.
      </div>
    </div>
  );
};

export default AdminPage; 