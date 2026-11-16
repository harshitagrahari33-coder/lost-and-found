const chatService = require('../services/chatService');
const { uploadImageBuffer } = require('../services/cloudinaryService');
const { sendMessageSchema } = require('../utils/validators');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const createConversation = asyncHandler(async (req, res) => {
  const { itemId } = req.body;
  if (!itemId) {
    throw ApiError.badRequest('itemId is required to initiate a conversation', 'ITEM_ID_REQUIRED');
  }

  const conversation = await chatService.findOrCreateConversation(itemId, req.user);

  res.status(200).json({
    success: true,
    data: { conversation },
  });
});

const getConversations = asyncHandler(async (req, res) => {
  const conversations = await chatService.getUserConversations(req.user);
  res.status(200).json({
    success: true,
    data: { conversations },
  });
});

const getConversation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conversation = await chatService.getConversationById(id, req.user);
  res.status(200).json({
    success: true,
    data: { conversation },
  });
});

const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const messages = await chatService.getConversationMessages(id, req.user, req.query);
  res.status(200).json({
    success: true,
    data: { messages },
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validated = sendMessageSchema.parse(req.body);
  const message = await chatService.sendMessage(id, validated, req.user);

  res.status(201).json({
    success: true,
    data: { message },
  });
});

const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Image file is required', 'FILE_REQUIRED');
  }

  const uploaded = await uploadImageBuffer(req.file.buffer, 'kiet_chat_attachments');

  res.status(200).json({
    success: true,
    data: uploaded,
  });
});

const markRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await chatService.markConversationAsRead(id, req.user);

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  createConversation,
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  uploadAttachment,
  markRead,
};
