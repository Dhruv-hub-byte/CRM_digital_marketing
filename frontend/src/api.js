import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

API.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('accessToken');
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    
    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return API(originalRequest);
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(err);
      }
      
      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          { refreshToken }
        );
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        API.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        
        isRefreshing = false;
        return API(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        isRefreshing = false;
        return Promise.reject(refreshErr);
      }
    }
    
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  refresh: (refreshToken) => API.post('/auth/refresh', { refreshToken }),
  logout: (refreshToken) => API.post('/auth/logout', { refreshToken }),
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
  createCampaign: (data) => API.post('/linkedin/campaigns', data),
  publishAd: (data) => API.post('/linkedin/publish-ad', data),
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
  submit: (id) => API.post(`/ads/${id}/submit`),
  approve: (id) => API.post(`/ads/${id}/approve`),
  reject: (id, note) => API.post(`/ads/${id}/reject`, { note }),
  getPending: () => API.get('/ads/admin/pending'),
  auditAllAds: () => API.get('/ads/audit/all-ads'),
  auditLogs: () => API.get('/ads/audit/logs'),
};

export const landingAPI = {
  getCampaign: (id) => axios.get(`${process.env.REACT_APP_API_URL}/landing/campaign/${id}`),
  submitInterest: (id, data) => axios.post(`${process.env.REACT_APP_API_URL}/landing/campaign/${id}/interest`, data),
};

export default API;
