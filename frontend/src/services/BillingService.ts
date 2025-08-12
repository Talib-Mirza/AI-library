import api from '../utils/axiosConfig';

export const BillingService = {
  async createCheckoutSession(): Promise<string> {
    const { data } = await api.post('/billing/checkout-session');
    return data.url as string;
  },
  async createPortalSession(): Promise<string> {
    const { data } = await api.post('/billing/portal-session');
    return data.url as string;
  },
  async getPortalLink(): Promise<string> {
    const { data } = await api.get('/billing/portal-link');
    return data.url as string;
  },
  async getPlan(): Promise<any> {
    const { data } = await api.get('/billing/plan');
    return data;
  }
};

export default BillingService; 