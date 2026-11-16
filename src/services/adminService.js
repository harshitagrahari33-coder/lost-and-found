import { api } from './api';

export const adminService = {
  async getStats() {
    const res = await api.get('/admin/stats');
    return res.data.data.stats;
  },

  async getUsers(page = 1, limit = 20) {
    const res = await api.get('/admin/users', { params: { page, limit } });
    return res.data.data;
  },

  async suspendUser(userId, reason) {
    const res = await api.patch(`/admin/users/${userId}/suspend`, { reason });
    return res.data.data;
  },

  async unsuspendUser(userId) {
    const res = await api.patch(`/admin/users/${userId}/unsuspend`);
    return res.data.data;
  },

  async getAdminItems(page = 1, limit = 20) {
    const res = await api.get('/admin/items', { params: { page, limit } });
    return res.data.data;
  },

  async deleteItem(itemId) {
    const res = await api.delete(`/admin/items/${itemId}`);
    return res.data.data;
  },

  async getReports(status = '', page = 1, limit = 20) {
    const params = { page, limit };
    if (status) params.status = status;
    const res = await api.get('/admin/reports', { params });
    return res.data.data;
  },

  async updateReport(reportId, status) {
    const res = await api.patch(`/admin/reports/${reportId}`, { status });
    return res.data.data;
  },
};
