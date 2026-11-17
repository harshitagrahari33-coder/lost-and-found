const itemService = require('../services/itemService');
const { createItemSchema, updateItemSchema, matchPreviewSchema } = require('../utils/validators');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const matchingService = require('../services/matchingService');

const getItems = asyncHandler(async (req, res) => {
  const result = await itemService.getItems(req.query);
  res.status(200).json({
    success: true,
    data: result,
  });
});

const getItemById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await itemService.getItemById(id, req.user);
  res.status(200).json({
    success: true,
    data: { item },
  });
});

const createItem = asyncHandler(async (req, res) => {
  let itemData = req.body;

  // Handle location if sent as JSON string in multipart form-data
  if (typeof itemData.location === 'string') {
    try {
      itemData.location = JSON.parse(itemData.location);
    } catch {
      throw ApiError.badRequest('Invalid location payload format', 'INVALID_LOCATION_JSON');
    }
  }

  const validatedData = createItemSchema.parse(itemData);
  const files = req.files || [];

  const created = await itemService.createItem(validatedData, files, req.user);

  res.status(201).json({
    success: true,
    data: { item: created },
  });
});

const updateItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const validated = updateItemSchema.parse(req.body);
  const updated = await itemService.updateItem(id, validated, req.user);

  res.status(200).json({
    success: true,
    data: { item: updated },
  });
});

const deleteItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await itemService.deleteItem(id, req.user);

  res.status(200).json({
    success: true,
    data: result,
  });
});

const resolveItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const resolved = await itemService.resolveItem(id, req.user);

  res.status(200).json({
    success: true,
    data: { item: resolved },
  });
});

const getItemLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await itemService.getItemById(id, req.user);

  res.status(200).json({
    success: true,
    data: item.location,
  });
});

const previewMatches = asyncHandler(async (req, res) => {
  const draft = matchPreviewSchema.parse(req.body);
  const matches = await matchingService.previewMatches(draft);
  res.status(200).json({ success: true, data: { matches } });
});

const getItemMatches = asyncHandler(async (req, res) => {
  const matches = await matchingService.getMatchesForItem(req.params.id, req.user);
  res.status(200).json({ success: true, data: { matches } });
});

module.exports = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  resolveItem,
  getItemLocation,
  previewMatches,
  getItemMatches,
};
