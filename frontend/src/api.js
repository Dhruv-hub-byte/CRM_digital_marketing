import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me'),
};

export const campaignsAPI = {
  getAll: () => API.get('/campaigns'),
  getOne: (id) => API.get(`/campaigns/${id}`),
  create: (data) => API.post('/campaigns', data),
  update: (id, data) => API.put(`/campaigns/${id}`, data),
  delete: (id) => API.delete(`/campaigns/${id}`),
  getAnalytics: (id) => API.get(`/campaigns/${id}/analytics`),
};

export const leadsAPI = {
  getAll: (params) => API.get('/leads', { params }),
  getOne: (id) => API.get(`/leads/${id}`),
  create: (data) => API.post('/leads', data),
  update: (id, data) => API.put(`/leads/${id}`, data),
  delete: (id) => API.delete(`/leads/${id}`),
  addActivity: (id, data) => API.post(`/leads/${id}/activities`, data),
  getSalesUsers: () => API.get('/leads/meta/sales-users'),
};

export const analyticsAPI = {
  dashboard: () => API.get('/analytics/dashboard'),
};

export const adminAPI = {
  getUsers: () => API.get('/admin/users'),
  updateRole: (id, role) => API.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
  getLogs: () => API.get('/admin/logs'),
  getStats: () => API.get('/admin/stats'),
};

export const settingsAPI = {
  getProfile: () => API.get('/settings/profile'),
  updateProfile: (data) => API.put('/settings/profile', data),
  changePassword: (data) => API.put('/settings/password', data),
  getAutomation: () => API.get('/settings/automation'),
  saveAutomation: (data) => API.put('/settings/automation', data),
  getSystemStats: () => API.get('/settings/admin/system'),
  getAdminUsers: () => API.get('/settings/admin/users'),
};

export const linkedinAPI = {
  connect: () => API.post('/linkedin/connect'),
  disconnect: () => API.delete('/linkedin/disconnect'),
  getStatus: () => API.get('/linkedin/status'),
  getAdAccounts: () => API.get('/linkedin/ad-accounts'),
  getCampaigns: (accountId) => API.get(`/linkedin/campaigns/${accountId}`),
  getAnalytics: (accountId) => API.get(`/linkedin/analytics/${accountId}`),
};

export const adsAPI = {
  getTemplates: () => API.get('/ads/templates'),
  generateCopy: (data) => API.post('/ads/generate-copy', data),
  getAll: () => API.get('/ads'),
  getOne: (id) => API.get(`/ads/${id}`),
  create: (data) => API.post('/ads', data),
  update: (id, data) => API.put(`/ads/${id}`, data),
  publish: (id) => API.post(`/ads/${id}/publish`),
  delete: (id) => API.delete(`/ads/${id}`),
  auditAllAds: () => API.get('/ads/audit/all-ads'),
  auditLogs: () => API.get('/ads/audit/logs'),
};

export default API;
