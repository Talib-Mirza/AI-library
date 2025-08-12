import api from '../utils/axiosConfig';

export interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  is_verified: boolean;
  subscription_status?: string | null;
  subscription_tier?: string | null;
  stripe_customer_id?: string | null;
  created_at: string;
  updated_at?: string;
  last_login_at?: string;
  total_files_uploaded: number;
  total_tts_minutes: number;
  total_ai_queries: number;
  monthly_tts_minutes_used: number;
  monthly_ai_queries_used: number;
  monthly_book_uploads_used: number;
  temporary_password?: string;
}

export interface PaginatedAdminUsers {
  items: AdminUser[];
  total: number;
  skip: number;
  limit: number;
}

const AdminService = {
  async getUsers(skip = 0, limit = 50): Promise<PaginatedAdminUsers> {
    const { data } = await api.get('/admin/users', { params: { skip, limit } });
    return data as PaginatedAdminUsers;
  },
  async createUser(payload: { email: string; full_name: string; password?: string; is_verified?: boolean; subscription_tier?: string; subscription_status?: string; }): Promise<AdminUser> {
    const { data } = await api.post('/admin/users', payload);
    return data as AdminUser;
  },
  async updateUserPlan(userId: number, payload: { subscription_tier: string; subscription_status: string; subscription_renewal_at?: string; }): Promise<AdminUser> {
    const { data } = await api.post(`/admin/users/${userId}/plan`, payload);
    return data as AdminUser;
  },
  async deleteUser(userId: number): Promise<void> {
    await api.delete(`/admin/users/${userId}`);
  }
};

export default AdminService; 