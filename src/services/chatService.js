import { io } from 'socket.io-client';
import { api, getAccessToken, API_BASE_URL } from './api';

function resolveSocketUrl() {
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (envSocketUrl && envSocketUrl.trim()) {
    return envSocketUrl.trim().replace(/\/+$/, '');
  }
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/api\/?$/, '');
  }
  return 'http://localhost:5001';
}

export const SOCKET_URL = resolveSocketUrl();

let socket = null;

export const chatService = {
  // REST methods
  async createConversation(itemId) {
    const res = await api.post('/conversations', { itemId });
    return res.data.data.conversation;
  },

  async getConversations() {
    const res = await api.get('/conversations');
    return res.data.data.conversations;
  },

  async getConversation(id) {
    const res = await api.get(`/conversations/${id}`);
    return res.data.data.conversation;
  },

  async getMessages(id, query = {}) {
    const res = await api.get(`/conversations/${id}/messages`, { params: query });
    return res.data.data.messages;
  },

  async sendMessage(conversationId, text, attachments = []) {
    const res = await api.post(`/conversations/${conversationId}/messages`, {
      text,
      attachments,
    });
    return res.data.data.message;
  },

  async uploadAttachment(conversationId, file) {
    const formData = new FormData();
    formData.append('attachment', file);
    const res = await api.post(`/conversations/${conversationId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async markRead(conversationId) {
    const res = await api.patch(`/conversations/${conversationId}/read`);
    return res.data.data;
  },

  // Socket.IO real-time methods
  connectSocket() {
    const token = getAccessToken();
    if (!token) return null;

    if (socket && socket.connected) {
      return socket;
    }

    if (socket) {
      socket.disconnect();
    }

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionAttempts: 5,
    });

    return socket;
  },

  getSocket() {
    if (!socket || !socket.connected) {
      return this.connectSocket();
    }
    return socket;
  },

  disconnectSocket() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  joinConversation(conversationId, callback) {
    const s = this.getSocket();
    if (s) {
      s.emit('joinConversation', { conversationId }, callback);
    }
  },

  sendSocketMessage(conversationId, text, attachments = [], callback) {
    const s = this.getSocket();
    if (s) {
      s.emit('sendMessage', { conversationId, text, attachments }, callback);
    }
  },

  emitTyping(conversationId) {
    const s = this.getSocket();
    if (s) s.emit('typing', { conversationId });
  },

  emitStopTyping(conversationId) {
    const s = this.getSocket();
    if (s) s.emit('stopTyping', { conversationId });
  },

  emitMessageRead(conversationId) {
    const s = this.getSocket();
    if (s) s.emit('messageRead', { conversationId });
  },
};
