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

export default API;
