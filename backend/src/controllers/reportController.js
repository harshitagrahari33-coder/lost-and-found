const Report = require('../models/Report');
const Item = require('../models/Item');
const { createReportSchema } = require('../utils/validators');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const xss = require('xss');

const createReport = asyncHandler(async (req, res) => {
  const validated = createReportSchema.parse(req.body);

  const item = await Item.findById(validated.itemId);
  if (!item) {
    throw ApiError.notFound('Item report not found', 'ITEM_NOT_FOUND');
  }

  // Check if a pending report already exists from this user for this item
  const existing = await Report.findOne({
    reporterId: req.user._id,
    itemId: validated.itemId,
    status: 'pending',
  });

  if (existing) {
    throw ApiError.conflict(
      'You already have a pending report under review for this item',
      'PENDING_REPORT_EXISTS'
    );
  }

  const report = await Report.create({
    reporterId: req.user._id,
    itemId: validated.itemId,
    reason: validated.reason,
    description: xss(validated.description || ''),
    status: 'pending',
  });

  res.status(201).json({
    success: true,
    data: { report },
  });
});

module.exports = {
  createReport,
};
