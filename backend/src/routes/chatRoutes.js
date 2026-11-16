const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');
const { upload, validateMagicBytes } = require('../middleware/upload');
const ApiError = require('../utils/ApiError');

function validateIdParam(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ApiError.notFound('Invalid conversation ID', 'INVALID_ID');
  }
  next();
}

router.use(requireAuth);

router.post('/', chatController.createConversation);
router.get('/', chatController.getConversations);
router.get('/:id', validateIdParam, chatController.getConversation);
router.get('/:id/messages', validateIdParam, chatController.getMessages);
router.post('/:id/messages', validateIdParam, chatController.sendMessage);
router.post(
  '/:id/attachments',
  validateIdParam,
  upload.single('attachment'),
  validateMagicBytes,
  chatController.uploadAttachment
);
router.patch('/:id/read', validateIdParam, chatController.markRead);

module.exports = router;
