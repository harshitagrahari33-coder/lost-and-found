import { api, setAccessToken } from './api';

export const authService = {
  async requestOtp(email) {
    const res = await api.post('/auth/request-otp', { email });
    return res.data;
  },

  async verifyOtp(email, otp, name = '') {
    const payload = { email, otp };
    if (name) payload.name = name;

    const res = await api.post('/auth/verify-otp', payload);
    if (res.data.data?.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data;
  },

  async refreshToken() {
    const res = await api.post('/auth/refresh');
    if (res.data.data?.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data;
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data.data.user;
  },

  async updateProfile(data) {
    const res = await api.patch('/auth/profile', data);
    return res.data.data.user;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },
};
