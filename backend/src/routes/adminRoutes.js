const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const ApiError = require('../utils/ApiError');

function validateIdParam(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    throw ApiError.notFound('Invalid resource ID', 'INVALID_ID');
  }
  next();
}

router.use(requireAuth, requireAdmin);

router.get('/users', adminController.getUsers);
router.patch('/users/:id/suspend', validateIdParam, adminController.suspendUser);
router.patch('/users/:id/unsuspend', validateIdParam, adminController.unsuspendUser);

router.get('/items', adminController.getAdminItems);
router.delete('/items/:id', validateIdParam, adminController.adminDeleteItem);

router.get('/reports', adminController.getReports);
router.patch('/reports/:id', validateIdParam, adminController.updateReport);

router.get('/stats', adminController.getAdminStats);

module.exports = router;
