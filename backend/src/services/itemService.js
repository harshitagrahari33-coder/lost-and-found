const Item = require('../models/Item');
const { uploadImageBuffer, deleteImage } = require('./cloudinaryService');
const { sanitizeLocation } = require('./locationService');
const ApiError = require('../utils/ApiError');
const xss = require('xss');

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

async function getItems(queryParams = {}) {
  const {
    search,
    type,
    category,
    location,
    status = 'active',
    reporterId,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sort = 'newest',
  } = queryParams;

  const filter = {};

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (type && type !== 'all') {
    filter.type = type;
  }

  if (category && category !== 'All Categories') {
    filter.category = category;
  }

  if (reporterId) {
    filter.reporterId = reporterId;
  }

  if (location) {
    filter['location.name'] = { $regex: escapeRegex(location), $options: 'i' };
  }

  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }

  if (search && search.trim()) {
    // Use MongoDB text search index
    filter.$text = { $search: search.trim() };
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (safePage - 1) * safeLimit;

  const sortOrder = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

  const [items, total] = await Promise.all([
    Item.find(filter)
      .sort(sortOrder)
      .skip(skip)
      .limit(safeLimit)
      .populate('reporterId', 'name collegeId avatar')
      .lean(),
    Item.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / safeLimit) || 1;

  return {
    items,
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };
}

async function getItemById(itemId, currentUser = null) {
  const item = await Item.findById(itemId)
    .populate('reporterId', 'name collegeId avatar')
    .lean();

  if (!item) {
    throw ApiError.notFound('Item report not found', 'ITEM_NOT_FOUND');
  }

  // Sanitize location coordinates according to authentication status
  const sanitizedLoc = sanitizeLocation(item.location, Boolean(currentUser));
  item.location = sanitizedLoc;

  return item;
}

async function createItem(data, imageFiles = [], user) {
  const uploadedImages = [];

  for (const file of imageFiles) {
    const uploaded = await uploadImageBuffer(file.buffer);
    uploadedImages.push(uploaded);
  }

  const sanitizedTitle = xss(data.title.trim());
  const sanitizedDesc = xss(data.description.trim());
  const sanitizedLocName = xss(data.location.name.trim());
  const sanitizedLocAddress = xss(data.location.address || '');

  const lat = Number(data.location.latitude);
  const lng = Number(data.location.longitude);

  const newItem = await Item.create({
    type: data.type,
    title: sanitizedTitle,
    description: sanitizedDesc,
    category: data.category,
    images: uploadedImages,
    location: {
      name: sanitizedLocName,
      address: sanitizedLocAddress,
      latitude: lat,
      longitude: lng,
      geo: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    },
    date: data.date ? new Date(data.date) : new Date(),
    reporterId: user._id, // Source of truth: always from verified JWT user
    status: 'active',
  });

  return getItemById(newItem._id, user);
}

async function updateItem(itemId, data, user) {
  const item = await Item.findById(itemId);
  if (!item) {
    throw ApiError.notFound('Item not found', 'ITEM_NOT_FOUND');
  }

  // Authorization check: owner or admin
  const isOwner = item.reporterId.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You are not authorized to update this item', 'NOT_ITEM_OWNER');
  }

  if (data.title) item.title = xss(data.title.trim());
  if (data.description) item.description = xss(data.description.trim());
  if (data.category) item.category = data.category;
  if (data.type) item.type = data.type;
  if (data.date) item.date = new Date(data.date);

  if (data.location) {
    const lat = Number(data.location.latitude);
    const lng = Number(data.location.longitude);
    item.location = {
      name: xss(data.location.name.trim()),
      address: xss(data.location.address || ''),
      latitude: lat,
      longitude: lng,
      geo: { type: 'Point', coordinates: [lng, lat] },
    };
  }

  await item.save();
  return getItemById(item._id, user);
}

async function deleteItem(itemId, user) {
  const item = await Item.findById(itemId);
  if (!item) {
    throw ApiError.notFound('Item not found', 'ITEM_NOT_FOUND');
  }

  const isOwner = item.reporterId.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You are not authorized to delete this item', 'NOT_ITEM_OWNER');
  }

  // Remove images from Cloudinary
  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      if (img.publicId) {
        await deleteImage(img.publicId);
      }
    }
  }

  await Item.findByIdAndDelete(itemId);
  return { message: 'Item and associated media successfully removed' };
}

async function resolveItem(itemId, user) {
  const item = await Item.findById(itemId);
  if (!item) {
    throw ApiError.notFound('Item not found', 'ITEM_NOT_FOUND');
  }

  const isOwner = item.reporterId.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('You are not authorized to resolve this item', 'NOT_ITEM_OWNER');
  }

  item.status = 'resolved';
  item.resolvedAt = new Date();
  item.resolvedBy = user._id;

  await item.save();
  return getItemById(item._id, user);
}

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  resolveItem,
};
