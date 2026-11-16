const User = require('../models/User');
const Item = require('../models/Item');
const Report = require('../models/Report');
const Conversation = require('../models/Conversation');
const { deleteItem: serviceDeleteItem } = require('../services/itemService');
const { revokeAllUserTokens } = require('../services/tokenService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const xss = require('xss');

const getUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      users,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

const getAdminItems = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Item.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reporterId', 'name collegeId email')
      .lean(),
    Item.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

const adminDeleteItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await serviceDeleteItem(id, req.user);
  res.status(200).json({
    success: true,
    data: result,
  });
});

const suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const reason = xss(req.body.reason || 'Suspended by campus administrator');

  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  }

  user.isSuspended = true;
  user.suspendedReason = reason;
  await user.save();

  // Immediately revoke all existing refresh tokens
  await revokeAllUserTokens(user._id);

  res.status(200).json({
    success: true,
    data: { message: `User ${user.email} suspended`, user },
  });
});

const unsuspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  }

  user.isSuspended = false;
  user.suspendedReason = '';
  await user.save();

  res.status(200).json({
    success: true,
    data: { message: `User ${user.email} reactivated`, user },
  });
});

const getReports = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reporterId', 'name email collegeId')
      .populate('itemId', 'title type status images')
      .lean(),
    Report.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: {
      reports,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  });
});

const updateReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['pending', 'reviewed', 'resolved'].includes(status)) {
    throw ApiError.badRequest('Invalid report status', 'INVALID_STATUS');
  }

  const report = await Report.findById(id);
  if (!report) {
    throw ApiError.notFound('Report not found', 'REPORT_NOT_FOUND');
  }

  report.status = status;
  report.reviewedBy = req.user._id;
  report.reviewedAt = new Date();
  await report.save();

  res.status(200).json({
    success: true,
    data: { report },
  });
});

const getAdminStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalItems,
    lostItems,
    foundItems,
    resolvedItems,
    openReports,
    activeConversations,
  ] = await Promise.all([
    User.countDocuments(),
    Item.countDocuments(),
    Item.countDocuments({ type: 'lost' }),
    Item.countDocuments({ type: 'found' }),
    Item.countDocuments({ status: 'resolved' }),
    Report.countDocuments({ status: 'pending' }),
    Conversation.countDocuments(),
  ]);

  res.status(200).json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalItems,
        lostItems,
        foundItems,
        resolvedItems,
        openReports,
        activeConversations,
      },
    },
  });
});

module.exports = {
  getUsers,
  getAdminItems,
  adminDeleteItem,
  suspendUser,
  unsuspendUser,
  getReports,
  updateReport,
  getAdminStats,
};
