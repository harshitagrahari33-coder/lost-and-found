const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Item = require('../models/Item');
const ApiError = require('../utils/ApiError');
const xss = require('xss');
const mongoose = require('mongoose');

function generateParticipantKey(userAId, userBId) {
  const sorted = [userAId.toString(), userBId.toString()].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

async function findOrCreateConversation(itemId, callerUser) {
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    throw ApiError.badRequest('Referenced item report not found', 'ITEM_NOT_FOUND');
  }

  const item = await Item.findById(itemId);
  if (!item) {
    throw ApiError.notFound('Referenced item report not found', 'ITEM_NOT_FOUND');
  }

  const reporterId = (item.reporterId?._id || item.reporterId).toString();
  const callerId = (callerUser?._id || callerUser?.id).toString();

  // Self-chat restriction
  if (reporterId === callerId) {
    throw ApiError.badRequest('You cannot start a conversation with yourself on your own item', 'SELF_CHAT_DISALLOWED');
  }

  const participantKey = generateParticipantKey(callerId, reporterId);
  const participants = [callerUser._id || callerUser.id, item.reporterId?._id || item.reporterId];

  // Atomic find or create using sorted participantKey
  let conversation = await Conversation.findOne({ itemId, participantKey })
    .populate('participants', 'name collegeId avatar')
    .populate('itemId', 'title type category images location status');

  if (!conversation) {
    try {
      const created = await Conversation.create({
        itemId,
        participants,
        participantKey,
        lastMessage: '',
        lastMessageAt: new Date(),
        unreadCounts: {
          [callerId]: 0,
          [reporterId]: 0,
        },
      });

      conversation = await Conversation.findById(created._id)
        .populate('participants', 'name collegeId avatar')
        .populate('itemId', 'title type category images location status');
    } catch (err) {
      if (err.code === 11000) {
        // Race condition: another concurrent request created it first!
        conversation = await Conversation.findOne({ itemId, participantKey })
          .populate('participants', 'name collegeId avatar')
          .populate('itemId', 'title type category images location status');
      } else {
        throw err;
      }
    }
  }

  return conversation;
}

async function getUserConversations(user) {
  const conversations = await Conversation.find({ participants: user._id })
    .sort({ lastMessageAt: -1 })
    .populate('participants', 'name collegeId avatar')
    .populate('itemId', 'title type category images location status')
    .lean();

  return conversations.map((conv) => {
    const unread = (conv.unreadCounts && conv.unreadCounts[user._id.toString()]) || 0;
    return {
      ...conv,
      unreadCount: unread,
    };
  });
}

async function getConversationById(conversationId, user) {
  const conversation = await Conversation.findById(conversationId)
    .populate('participants', 'name collegeId avatar')
    .populate('itemId', 'title type category images location status');

  if (!conversation) {
    throw ApiError.notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
  }

  const isParticipant = conversation.participants.some(
    (p) => p._id.toString() === user._id.toString()
  );

  if (!isParticipant && user.role !== 'admin') {
    throw ApiError.forbidden('You are not a participant in this conversation', 'NOT_PARTICIPANT');
  }

  return conversation;
}

async function getConversationMessages(conversationId, user, query = {}) {
  await getConversationById(conversationId, user); // checks membership

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 30));
  const skip = (page - 1) * limit;

  const messages = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', 'name collegeId avatar')
    .lean();

  return messages.reverse(); // Chronological order
}

async function sendMessage(conversationId, data, senderUser) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw ApiError.notFound('Conversation not found', 'CONVERSATION_NOT_FOUND');
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === senderUser._id.toString()
  );

  if (!isParticipant) {
    throw ApiError.forbidden('Cannot post to a conversation you are not part of', 'NOT_PARTICIPANT');
  }

  const rawText = (data.text || '').trim();
  const attachments = Array.isArray(data.attachments) ? data.attachments : [];

  if (!rawText && attachments.length === 0) {
    throw ApiError.badRequest('Message text or image attachment required', 'EMPTY_MESSAGE');
  }

  const sanitizedText = xss(rawText.slice(0, 2000));

  const message = await Message.create({
    conversationId,
    senderId: senderUser._id,
    text: sanitizedText,
    attachments,
    readBy: [{ userId: senderUser._id, readAt: new Date() }],
  });

  // Update conversation lastMessage & increment unreadCounts for the other participant
  conversation.lastMessage = sanitizedText || (attachments.length ? '[Image attachment]' : '');
  conversation.lastMessageAt = new Date();

  conversation.participants.forEach((pId) => {
    const pStr = pId.toString();
    if (pStr !== senderUser._id.toString()) {
      const current = conversation.unreadCounts ? conversation.unreadCounts.get(pStr) || 0 : 0;
      if (!conversation.unreadCounts) conversation.unreadCounts = new Map();
      conversation.unreadCounts.set(pStr, current + 1);
    }
  });

  await conversation.save();

  return Message.findById(message._id).populate('senderId', 'name collegeId avatar');
}

async function markConversationAsRead(conversationId, user) {
  const conversation = await getConversationById(conversationId, user);

  // Clear unread count for user
  if (conversation.unreadCounts) {
    conversation.unreadCounts.set(user._id.toString(), 0);
    await conversation.save();
  }

  // Update readBy on unread messages
  const now = new Date();
  await Message.updateMany(
    {
      conversationId,
      'readBy.userId': { $ne: user._id },
    },
    {
      $addToSet: {
        readBy: { userId: user._id, readAt: now },
      },
    }
  );

  return { success: true, conversationId, readAt: now };
}

module.exports = {
  findOrCreateConversation,
  getUserConversations,
  getConversationById,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
};
