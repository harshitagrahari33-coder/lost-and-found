const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { upload, validateMagicBytes } = require('../middleware/upload');
const ApiError = require('../utils/ApiError');

function validateIdParam(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ApiError.notFound('Invalid item ID', 'INVALID_ID');
  }
  next();
}

router.get('/', optionalAuth, itemController.getItems);
router.get('/:id', validateIdParam, optionalAuth, itemController.getItemById);
router.get('/:id/location', validateIdParam, optionalAuth, itemController.getItemLocation);

router.post(
  '/',
  requireAuth,
  upload.array('images', 5),
  validateMagicBytes,
  itemController.createItem
);

router.patch('/:id', validateIdParam, requireAuth, itemController.updateItem);
router.delete('/:id', validateIdParam, requireAuth, itemController.deleteItem);
router.post('/:id/resolve', validateIdParam, requireAuth, itemController.resolveItem);

module.exports = router;
