import { api } from './api';

export function normalizeItem(item) {
  if (!item) return item;
  const locationName = typeof item.location === 'object' ? item.location.name : (item.location || '');
  const locationAddress = typeof item.location === 'object' ? item.location.address : '';
  const lat = typeof item.location === 'object' ? item.location.latitude : item.latitude;
  const lng = typeof item.location === 'object' ? item.location.longitude : item.longitude;
  const primaryImage = (item.images && item.images.length > 0 && item.images[0].url) ? item.images[0].url : (item.imageUrl || '');
  const reporterName = item.reporterId?.name || item.reporterId?.collegeId || item.user || 'KIET Member';

  return {
    ...item,
    id: item._id || item.id,
    _id: item._id || item.id,
    imageUrl: primaryImage,
    location: locationName,
    locationDetails: typeof item.location === 'object' ? item.location : { name: locationName, address: locationAddress, latitude: lat, longitude: lng },
    latitude: lat,
    longitude: lng,
    user: reporterName,
    reporter: item.reporterId,
    resolved: item.status === 'resolved',
  };
}

export const itemService = {
  async getItems(params = {}) {
    const res = await api.get('/items', { params });
    const data = res.data.data;
    return {
      ...data,
      items: (data.items || []).map(normalizeItem),
    };
  },

  async getItemById(id) {
    const res = await api.get(`/items/${id}`);
    return normalizeItem(res.data.data.item);
  },

  async getItemLocation(id) {
    const res = await api.get(`/items/${id}/location`);
    return res.data.data;
  },

  async createItem(formData) {
    const res = await api.post('/items', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return normalizeItem(res.data.data.item);
  },

  async updateItem(id, data) {
    const res = await api.patch(`/items/${id}`, data);
    return normalizeItem(res.data.data.item);
  },

  async deleteItem(id) {
    const res = await api.delete(`/items/${id}`);
    return res.data.data;
  },

  async resolveItem(id) {
    const res = await api.post(`/items/${id}/resolve`);
    return normalizeItem(res.data.data.item);
  },

  async getCampusLocations() {
    const res = await api.get('/locations/campus');
    return res.data.data.locations;
  },

  async createReport(reportData) {
    const res = await api.post('/reports', reportData);
    return res.data.data.report;
  },
};
