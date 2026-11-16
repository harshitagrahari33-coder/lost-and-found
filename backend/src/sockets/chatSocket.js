const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const { sendMessage: serviceSendMessage, markConversationAsRead } = require('../services/chatService');

// In-memory map of userId to active socket connection count
const onlineUsersMap = new Map();

// Throttle map: socket.id -> array of message timestamps
const socketMessageThrottles = new Map();

function initChatSocket(io) {
  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication token required in handshake.auth.token'));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return next(new Error('Invalid or expired authentication token'));
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return next(new Error('User account not found'));
      }

      if (user.isSuspended) {
        return next(new Error('Suspended users cannot access live chat'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Track user presence
    const currentCount = onlineUsersMap.get(userId) || 0;
    onlineUsersMap.set(userId, currentCount + 1);

    // Auto-join personal room for direct notifications
    socket.join(`user:${userId}`);

    // If first socket connection for this user, broadcast presence
    if (currentCount === 0) {
      socket.broadcast.emit('userOnline', { userId });
    }

    // Join conversation room after DB membership verification
    socket.on('joinConversation', async ({ conversationId }, callback) => {
      try {
        if (!conversationId) {
          if (callback) callback({ success: false, message: 'conversationId required' });
          return;
        }

        const conv = await Conversation.findById(conversationId);
        if (!conv) {
          if (callback) callback({ success: false, message: 'Conversation not found' });
          return;
        }

        const isMember = conv.participants.some(
          (p) => p.toString() === userId
        );

        if (!isMember && socket.user.role !== 'admin') {
          if (callback) callback({ success: false, message: 'Access denied: not a participant' });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        if (callback) callback({ success: true, conversationId });
      } catch (err) {
        if (callback) callback({ success: false, message: err.message });
      }
    });

    // Send message event with per-socket rate limit
    socket.on('sendMessage', async (payload, callback) => {
      try {
        const { conversationId, text, attachments } = payload || {};

        // Throttle check: max 20 msgs in 10 seconds
        const now = Date.now();
        const timestamps = socketMessageThrottles.get(socket.id) || [];
        const recentTimestamps = timestamps.filter((t) => now - t < 10000);
        if (recentTimestamps.length >= 20) {
          const errPayload = { success: false, message: 'Rate limit exceeded: please slow down message sending.' };
          if (callback) callback(errPayload);
          socket.emit('error', errPayload);
          return;
        }
        recentTimestamps.push(now);
        socketMessageThrottles.set(socket.id, recentTimestamps);

        // Dispatch via business service (handles membership verification & persistence)
        const savedMessage = await serviceSendMessage(
          conversationId,
          { text, attachments },
          socket.user
        );

        // Emit receiveMessage to all participants in this conversation room
        io.to(`conversation:${conversationId}`).emit('receiveMessage', {
          message: savedMessage,
          conversationId,
        });

        // Also notify user personal rooms in case they are outside the conversation screen
        const conv = await Conversation.findById(conversationId);
        if (conv) {
          conv.participants.forEach((pId) => {
            const pStr = pId.toString();
            if (pStr !== userId) {
              io.to(`user:${pStr}`).emit('conversationUpdated', {
                conversationId,
                lastMessage: savedMessage.text || '[Attachment]',
                senderId: userId,
              });
            }
          });
        }

        if (callback) callback({ success: true, message: savedMessage });
      } catch (err) {
        if (callback) callback({ success: false, message: err.message });
        socket.emit('error', { success: false, message: err.message });
      }
    });

    // Typing indicators
    socket.on('typing', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing', {
        conversationId,
        userId,
        userName: socket.user.name,
      });
    });

    socket.on('stopTyping', ({ conversationId }) => {
      socket.to(`conversation:${conversationId}`).emit('stopTyping', {
        conversationId,
        userId,
      });
    });

    // Read receipt
    socket.on('messageRead', async ({ conversationId }) => {
      try {
        await markConversationAsRead(conversationId, socket.user);
        socket.to(`conversation:${conversationId}`).emit('messageRead', {
          conversationId,
          readBy: userId,
          readAt: new Date(),
        });
      } catch (err) {
        // Silently log or handle
      }
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      socketMessageThrottles.delete(socket.id);

      const count = onlineUsersMap.get(userId) || 1;
      if (count <= 1) {
        onlineUsersMap.delete(userId);
        socket.broadcast.emit('userOffline', { userId });
      } else {
        onlineUsersMap.set(userId, count - 1);
      }
    });
  });
}

function isUserOnline(userId) {
  return onlineUsersMap.has(userId.toString());
}

module.exports = {
  initChatSocket,
  isUserOnline,
  onlineUsersMap,
};
